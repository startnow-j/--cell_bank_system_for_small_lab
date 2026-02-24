import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { db } from '@/lib/db';

// 生成批量入库模板Excel文件
export async function GET() {
  try {
    // 获取所有存储位置
    const freezers = await db.freezer.findMany({
      include: {
        racks: {
          include: {
            boxes: {
              include: {
                _count: {
                  select: { cells: { where: { status: 'stored' } } },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 构建位置列表
    const locations: Array<{
      冰箱名称: string;
      架子名称: string;
      盒子名称: string;
      盒子规格: string;
      已存数量: number;
      存储路径: string;
    }> = [];

    for (const freezer of freezers) {
      for (const rack of freezer.racks) {
        for (const box of rack.boxes) {
          locations.push({
            冰箱名称: freezer.name,
            架子名称: rack.name,
            盒子名称: box.name,
            盒子规格: `${box.rows}×${box.cols}`,
            已存数量: box._count.cells,
            存储路径: `${freezer.name} → ${rack.name} → ${box.name}`,
          });
        }
      }
    }

    // 创建工作簿
    const workbook = xlsx.utils.book_new();

    // 第一个Sheet：入库模板
    const templateHeaders = [
      '细胞名称*',
      '细胞类型*',
      '代次*',
      '数量*',
      '冻存日期*',
      '冰箱名称*',
      '架子名称*',
      '盒子名称*',
      '位置*',
      '冻存液',
      '供体信息',
      '操作人',
      '备注',
    ];

    const templateExample = [
      'HEK293',
      '贴壁细胞',
      'P5',
      '3',
      '2024-01-15',
      locations[0]?.冰箱名称 || '1号冰箱',
      locations[0]?.架子名称 || 'A架',
      locations[0]?.盒子名称 || '盒子1',
      'A1,A2,A3',
      '10% DMSO + 90% FBS',
      '人源',
      '张医生',
      '示例备注',
    ];

    const templateSheet = xlsx.utils.aoa_to_sheet([templateHeaders, templateExample]);
    
    // 设置列宽
    templateSheet['!cols'] = [
      { wch: 12 }, // 细胞名称
      { wch: 12 }, // 细胞类型
      { wch: 8 },  // 代次
      { wch: 8 },  // 数量
      { wch: 12 }, // 冻存日期
      { wch: 15 }, // 冰箱名称
      { wch: 12 }, // 架子名称
      { wch: 12 }, // 盒子名称
      { wch: 15 }, // 位置
      { wch: 20 }, // 冻存液
      { wch: 12 }, // 供体信息
      { wch: 10 }, // 操作人
      { wch: 20 }, // 备注
    ];

    xlsx.utils.book_append_sheet(workbook, templateSheet, '入库模板');

    // 第二个Sheet：存储位置参考
    const locationHeaders = ['冰箱名称', '架子名称', '盒子名称', '盒子规格', '已存数量', '存储路径'];
    const locationData = locations.map(loc => [
      loc.冰箱名称,
      loc.架子名称,
      loc.盒子名称,
      loc.盒子规格,
      loc.已存数量,
      loc.存储路径,
    ]);

    const locationSheet = xlsx.utils.aoa_to_sheet([locationHeaders, ...locationData]);
    
    // 设置列宽
    locationSheet['!cols'] = [
      { wch: 15 }, // 冰箱名称
      { wch: 12 }, // 架子名称
      { wch: 12 }, // 盒子名称
      { wch: 10 }, // 盒子规格
      { wch: 10 }, // 已存数量
      { wch: 40 }, // 存储路径
    ];

    xlsx.utils.book_append_sheet(workbook, locationSheet, '存储位置参考');

    // 生成文件
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="batch_inbound_template_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('生成模板失败:', error);
    return NextResponse.json({ error: '生成模板失败' }, { status: 500 });
  }
}
