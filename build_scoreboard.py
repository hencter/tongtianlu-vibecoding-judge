# -*- coding: utf-8 -*-
import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()

# ================= Sheet 1: 最终成绩表 =================
ws = wb.active
ws.title = "最终成绩表"

thin = Side(style="thin", color="C9C4B8")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
head_fill = PatternFill("solid", fgColor="EFEADD")
gold_fill = PatternFill("solid", fgColor="FBF1CF")

title = ws.cell(row=1, column=1, value="通天路 VibeCoding 闪电赛｜最终成绩表")
title.font = Font(size=14, bold=True, color="2C2A26")
ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=9)

sub = ws.cell(row=2, column=1, value="权重：Engineering 25% / Decision 25% / UX 20% / Design 15% / Product 15%；所有加权分、扣分后得分、分差均由计算器工具运算")
sub.font = Font(size=9, color="7A7468")
ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=9)

headers = ["排名", "参赛者", "工程原始分", "决策原始分", "UX原始分", "设计原始分",
           "产品原始分", "加权基础分", "红队扣分", "最终分"]
for j, h in enumerate(headers, start=1):
    c = ws.cell(row=4, column=j, value=h)
    c.font = Font(bold=True, size=10)
    c.fill = head_fill
    c.border = border
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

# rank, name, E, D, UX, Des, P, base(calc), penalty, final(calc)
rows = [
    (1, "亦幸",       88, 78, 84, 88, 85, 84.25, 9,  75.25),
    (2, "小健老师",    87, 85, 85, 76, 92, 85.20, 11, 74.20),
    (3, "菜籽",       82, 46, 88, 84, 82, 74.50, 5,  69.50),
]
for i, r in enumerate(rows, start=5):
    for j, v in enumerate(r, start=1):
        c = ws.cell(row=i, column=j, value=v)
        c.border = border
        c.alignment = Alignment(horizontal="center", vertical="center")
        if j in (8, 10):
            c.number_format = "0.00"
    if r[0] == 1:
        for j in range(1, 11):
            ws.cell(row=i, column=j).fill = gold_fill
    ws.cell(row=i, column=2).font = Font(bold=True)

# 追加公式列：让 Excel 可重算复核
ws.cell(row=4, column=11, value="复核公式（Excel 自动重算）").font = Font(bold=True, size=10)
ws.cell(row=4, column=11).fill = head_fill
ws.cell(row=4, column=11).border = border
for i, r in enumerate(rows, start=5):
    f = f"=C{i}*0.25+D{i}*0.25+E{i}*0.20+F{i}*0.15+G{i}*0.15-I{i}"
    c = ws.cell(row=i, column=11, value=f)
    c.number_format = "0.00"
    c.border = border

note_row = 9
ws.cell(row=note_row, column=1,
        value="排名依据：亦幸 75.25 > 小健老师 74.20 > 菜籽 69.50。计算器算得冠亚军分差 = 1.05，>1.00，未触发 Tie Break。").font = Font(size=9, color="7A7468")
ws.merge_cells(start_row=note_row, start_column=1, end_row=note_row, end_column=11)

widths = [6, 10, 11, 11, 10, 11, 11, 11, 9, 10, 26]
for j, w in enumerate(widths, start=1):
    ws.column_dimensions[get_column_letter(j)].width = w
ws.row_dimensions[4].height = 30

# ================= Sheet 2: 计分审计 =================
a = wb.create_sheet("计分审计")
a.cell(row=1, column=1, value="计分审计记录（每一步均可复算）").font = Font(size=13, bold=True)
a.merge_cells(start_row=1, start_column=1, end_row=1, end_column=4)

contestants = [
    ("亦幸", 88, 78, 84, 88, 85, 9, 84.25, 75.25),
    ("小健老师", 87, 85, 85, 76, 92, 11, 85.20, 74.20),
    ("菜籽", 82, 46, 88, 84, 82, 5, 74.50, 69.50),
]

r0 = 3
for name, e, d, ux, de, p, pen, base, final in contestants:
    a.cell(row=r0, column=1, value=f"参赛者：{name}").font = Font(bold=True, size=11)
    a.cell(row=r0 + 1, column=1, value="计分输入")
    inputs = [("Engineering =", e), ("Decision =", d), ("UX =", ux),
              ("Design =", de), ("Product =", p), ("RedTeamPenalty =", pen)]
    for k, (label, val) in enumerate(inputs):
        a.cell(row=r0 + 2 + k, column=1, value=label)
        a.cell(row=r0 + 2 + k, column=2, value=val)
    br = r0 + 8
    a.cell(row=br, column=1, value="基础分公式")
    a.cell(row=br, column=2,
           value=f"{e} × 0.25 + {d} × 0.25 + {ux} × 0.20 + {de} × 0.15 + {p} × 0.15")
    a.cell(row=br, column=4, value=base).number_format = "0.00"
    a.cell(row=br + 1, column=1, value="计算器结果")
    a.cell(row=br + 1, column=2, value=f"FinalBase = {base}")
    fr = br + 2
    a.cell(row=fr, column=1, value="扣分公式")
    a.cell(row=fr, column=2, value=f"{base} - {pen}")
    a.cell(row=fr, column=4, value=final).number_format = "0.00"
    a.cell(row=fr + 1, column=1, value="计算器结果")
    a.cell(row=fr + 1, column=2, value=f"FinalScore = {final}")
    a.cell(row=fr + 2, column=1, value="最终显示成绩")
    a.cell(row=fr + 2, column=2, value=f"{final:.2f} / 100").font = Font(bold=True)
    r0 = fr + 5

# 分差审计
a.cell(row=r0, column=1, value="名次分差（计算器结果）").font = Font(bold=True, size=11)
diffs = [
    ("亦幸 - 小健老师（绝对差）", 1.05, "＞ 1.00，不触发 Tie Break"),
    ("小健老师 - 菜籽（绝对差）", 4.70, "＞ 1.00，不触发 Tie Break"),
    ("亦幸 - 菜籽（绝对差）", 5.75, "＞ 1.00，不触发 Tie Break"),
]
for i, (label, val, verdict) in enumerate(diffs, start=1):
    a.cell(row=r0 + i, column=1, value=label)
    a.cell(row=r0 + i, column=2, value=val)
    a.cell(row=r0 + i, column=3, value=verdict)

a.column_dimensions["A"].width = 26
a.column_dimensions["B"].width = 52
a.column_dimensions["C"].width = 26
a.column_dimensions["D"].width = 12

out = r"D:/WorkBuddy/通天路闪电赛评委委员会/通天路闪电赛_最终成绩表.xlsx"
wb.save(out)
print("saved:", out)
