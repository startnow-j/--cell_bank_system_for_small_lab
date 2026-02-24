import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 解析位置字符串（如 "A1" -> { row: 1, col: 1 }）
function parsePosition(pos: string): { row: number; col: number } | null {
  const match = pos.trim().toUpperCase().match(/^([A-Z])(\d+)$/);
  if (!match) return null;
  const row = match[1].charCodeAt(0) - 64; // A=1, B=2, ...
  const col = parseInt(match[2]);
  if (row < 1 || row > 26 || col < 1) return null;
  return { row, col };
}

// 生成位置键（用于检测批次内冲突）
function getPositionKey(freezerName: string, rackName: string, boxName: string, row: number, col: number): string {
  return `${freezerName}|${rackName}|${boxName}|${row}|${col}`;
}

// 行号转字母
const rowToLetter = (n: number) => String.fromCharCode(64 + n);

// 校验批量入库数据
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { rows } = data;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, errors: [{ row: 0, message: '没有数据需要校验' }] });
    }

    // 收集所有错误
    const errors: Array<{ row: number; field?: string; message: string; value?: string }> = [];

    // 获取所有冰箱数据用于校验
    const freezers = await db.freezer.findMany({
      include: {
        racks: {
          include: {
            boxes: {
              include: {
                cells: {
                  where: { status: 'stored' },
                  include: { batch: true },
                },
              },
            },
          },
        },
      },
    });

    // 构建查找映射
    const freezerMap = new Map<string, typeof freezers[0]>();
    freezers.forEach((f) => freezerMap.set(f.name, f));

    // 批次内位置占用追踪（检测同一批次内不同行的位置冲突）
    // key: 位置键, value: { rowNum, posStr }
    const batchPositionsUsed = new Map<string, { rowNum: number; posStr: string; name: string }>();

    // 校验每一行（收集所有错误，不跳过）
    for (const row of rows) {
      const rowNum = row.rowNum;
      let hasBasicError = false;

      // 必填字段校验
      if (!row.name?.trim()) {
        errors.push({ row: rowNum, field: 'name', message: '细胞名称不能为空' });
        hasBasicError = true;
      }
      if (!row.cellType?.trim()) {
        errors.push({ row: rowNum, field: 'cellType', message: '细胞类型不能为空' });
        hasBasicError = true;
      }
      if (!row.passage?.trim()) {
        errors.push({ row: rowNum, field: 'passage', message: '代次不能为空' });
        hasBasicError = true;
      }
      if (!row.quantity || row.quantity < 1) {
        errors.push({ row: rowNum, field: 'quantity', message: '数量必须大于0' });
        hasBasicError = true;
      }
      if (!row.freezeDate?.trim()) {
        errors.push({ row: rowNum, field: 'freezeDate', message: '冻存日期不能为空' });
        hasBasicError = true;
      }

      // 位置信息校验
      if (!row.freezerName?.trim()) {
        errors.push({ row: rowNum, field: 'freezerName', message: '冰箱名称不能为空' });
        hasBasicError = true;
      }
      if (!row.rackName?.trim()) {
        errors.push({ row: rowNum, field: 'rackName', message: '架子名称不能为空' });
        hasBasicError = true;
      }
      if (!row.boxName?.trim()) {
        errors.push({ row: rowNum, field: 'boxName', message: '盒子名称不能为空' });
        hasBasicError = true;
      }
      if (!row.positions || row.positions.length === 0) {
        errors.push({ row: rowNum, field: 'positions', message: '位置不能为空' });
        hasBasicError = true;
      }

      // 如果基础信息有误，跳过位置校验
      if (hasBasicError) continue;

      // 检查冰箱是否存在
      const freezer = freezerMap.get(row.freezerName);
      if (!freezer) {
        errors.push({ 
          row: rowNum, 
          field: 'freezerName', 
          message: `冰箱"${row.freezerName}"不存在`,
          value: row.freezerName 
        });
        continue;
      }

      // 检查架子是否存在
      const rack = freezer.racks.find((r) => r.name === row.rackName);
      if (!rack) {
        errors.push({ 
          row: rowNum, 
          field: 'rackName', 
          message: `架子"${row.rackName}"不存在或不属于冰箱"${row.freezerName}"`,
          value: `${row.freezerName} → ${row.rackName}`
        });
        continue;
      }

      // 检查盒子是否存在
      const box = rack.boxes.find((b) => b.name === row.boxName);
      if (!box) {
        errors.push({ 
          row: rowNum, 
          field: 'boxName', 
          message: `盒子"${row.boxName}"不存在或不属于架子"${row.rackName}"`,
          value: `${row.freezerName} → ${row.rackName} → ${row.boxName}`
        });
        continue;
      }

      // 检查位置数量是否匹配
      if (row.positions.length !== row.quantity) {
        errors.push({
          row: rowNum,
          field: 'positions',
          message: `数量为${row.quantity}管，但只填写了${row.positions.length}个位置`,
          value: `数量: ${row.quantity}, 位置: ${row.positions.length}个`
        });
        continue;
      }

      // 构建盒子已占用位置映射
      const occupiedMap = new Map<string, string>();
      box.cells.forEach((cell) => {
        const pos = `${cell.positionRow}-${cell.positionCol}`;
        occupiedMap.set(pos, cell.batch.name);
      });

      // 检查每个位置
      for (const posStr of row.positions) {
        const pos = parsePosition(posStr);
        if (!pos) {
          errors.push({
            row: rowNum,
            field: 'positions',
            message: `位置"${posStr}"格式错误，正确格式如：A1, B2, C3`,
            value: posStr
          });
          continue;
        }

        // 检查位置是否超出盒子范围
        if (pos.row > box.rows || pos.col > box.cols) {
          errors.push({
            row: rowNum,
            field: 'positions',
            message: `位置"${posStr}"超出盒子范围（盒子大小：${box.rows}行×${box.cols}列）`,
            value: posStr
          });
          continue;
        }

        // 检查位置是否已被数据库中的数据占用
        const dbKey = `${pos.row}-${pos.col}`;
        const occupied = occupiedMap.get(dbKey);
        if (occupied) {
          errors.push({
            row: rowNum,
            field: 'positions',
            message: `位置${posStr}已被占用（现有细胞：${occupied}）`,
            value: posStr
          });
          continue;
        }

        // 检查位置是否已被本批次其他行占用
        const batchKey = getPositionKey(row.freezerName, row.rackName, row.boxName, pos.row, pos.col);
        const previousUse = batchPositionsUsed.get(batchKey);
        if (previousUse) {
          errors.push({
            row: rowNum,
            field: 'positions',
            message: `位置${posStr}与本批次第${previousUse.rowNum}行的位置重复（细胞：${previousUse.name}）`,
            value: posStr
          });
          continue;
        }

        // 记录此位置已被本批次使用
        batchPositionsUsed.set(batchKey, { 
          rowNum, 
          posStr,
          name: row.name 
        });
      }
    }

    if (errors.length > 0) {
      // 按行号排序错误
      errors.sort((a, b) => a.row - b.row);
      return NextResponse.json({ success: false, errors });
    }

    return NextResponse.json({ success: true, message: '校验通过' });
  } catch (error) {
    console.error('批量入库校验失败:', error);
    return NextResponse.json(
      { success: false, errors: [{ row: 0, message: '校验失败，请稍后重试' }] },
      { status: 500 }
    );
  }
}
