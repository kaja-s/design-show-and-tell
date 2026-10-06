#!/usr/bin/env python3
"""Re-sample public/wolf.mp4 frame 0 into src/app/components/wolf-dots.ts.
Usage: ffmpeg -y -i public/wolf.mp4 -frames:v 1 -vf "scale=64:64:flags=area,format=gray" /tmp/wolf.pgm && python3 scripts/wolf-dots.py /tmp/wolf.pgm
"""
import sys
d=open(sys.argv[1],'rb').read(); parts=d.split(b'\n',3)
w,h=map(int,parts[1].split()); px=parts[3]
rows=[]
for y in range(h):
    row=''
    for x in range(w):
        v=px[y*w+x]/255
        dark=max(0.0,min(1.0,(1-v-0.08)/0.9))
        row+=str(min(9,int(round(dark**0.8*9))))
    rows.append(row)
def nonempty(r): return any(c!='0' for c in r)
top=next(i for i,r in enumerate(rows) if nonempty(r)); bot=len(rows)-next(i for i,r in enumerate(reversed(rows)) if nonempty(r))
cols=[i for i in range(w) if any(r[i]!='0' for r in rows)]
rows=[r[cols[0]:cols[-1]+1] for r in rows[top:bot]]
W=len(rows[0]); H=len(rows)
open('src/app/components/wolf-dots.ts','w').write('''// Halftone sample of public/wolf.mp4 frame 0, %dx%d, one digit per cell:
// 0 = paper, 9 = full ink. Generated with scripts/wolf-dots.py; re-run if the
// video changes. Used by the console easter egg and the print poster.
export const WOLF_COLS = %d;
export const WOLF_ROWS = %d;
export const WOLF_DOTS = [
%s
];
''' % (W,H,W,H, ',\n'.join('  "%s"'%r for r in rows)))
print("wrote src/app/components/wolf-dots.ts", W, H)
