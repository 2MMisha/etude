import sys
from PIL import Image
out, cols, fs = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f) for f in fs]; w, h = ims[0].size
s = 0.42 if h > w else 0.4
W, H = int(w * s), int(h * s); rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (W * cols + 8 * (cols - 1), H * rows + 8 * (rows - 1)), 'white')
for i, im in enumerate(ims): sheet.paste(im.resize((W, H)), ((i % cols) * (W + 8), (i // cols) * (H + 8)))
sheet.save(out, quality=85)
