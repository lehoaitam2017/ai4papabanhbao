import sys
import pandas as pd

print(sys.executable)
df = pd.read_excel("/Users/tatale/Downloads/THONG TIN CO BAN_Papabanhbao.xlsx")
df.to_markdown("/Users/tatale/Downloads/THONG TIN CO BAN_Papabanhbao.md", index=False)