import os
import math
from PIL import Image, ImageDraw, ImageFilter

def draw_icon_high_res(size=1024):
    # Create image with RGBA background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Background squircle
    pad = int(size * 0.05)
    radius = int(size * 0.22)
    bg_box = [pad, pad, size - pad, size - pad]
    
    # Base dark gradient simulation with deep navy & royal blue glow
    # Fill squircle with gradient / color
    draw.rounded_rectangle(bg_box, radius=radius, fill=(15, 23, 42, 255))
    
    # Glowing ring inside
    ring_pad = pad + int(size * 0.035)
    ring_radius = radius - int(size * 0.035)
    ring_box = [ring_pad, ring_pad, size - ring_pad, size - ring_pad]
    draw.rounded_rectangle(ring_box, radius=ring_radius, outline=(37, 99, 235, 200), width=int(size * 0.025))
    
    # Second inner glow ring (cyan accent)
    ring_pad2 = ring_pad + int(size * 0.015)
    ring_radius2 = ring_radius - int(size * 0.015)
    ring_box2 = [ring_pad2, ring_pad2, size - ring_pad2, size - ring_pad2]
    draw.rounded_rectangle(ring_box2, radius=ring_radius2, outline=(56, 189, 248, 120), width=int(size * 0.01))
    
    # 2. Iconic Letter 'C' in exact center
    center_x, center_y = size / 2, size / 2
    outer_r = size * 0.26
    stroke_w = size * 0.10
    inner_r = outer_r - stroke_w
    
    c_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(c_img)
    
    bbox_outer = [center_x - outer_r, center_y - outer_r, center_x + outer_r, center_y + outer_r]
    
    # Main arc from 40 to 320 degrees
    start_deg = 42
    end_deg = 318
    c_draw.arc(bbox_outer, start=start_deg, end=end_deg, fill=(255, 255, 255, 255), width=int(stroke_w))
    
    # Round caps at ends of 'C'
    mid_r = outer_r - (stroke_w / 2)
    cap_r = stroke_w / 2
    
    for angle in [start_deg, end_deg]:
        rad = math.radians(angle)
        cx = center_x + mid_r * math.cos(rad)
        cy = center_y + mid_r * math.sin(rad)
        c_draw.ellipse([cx - cap_r, cy - cap_r, cx + cap_r, cy + cap_r], fill=(255, 255, 255, 255))
        
    # Accent cyan dot at upper right end of 'C' for iconic tech branding look
    rad_accent = math.radians(start_deg)
    cx_acc = center_x + mid_r * math.cos(rad_accent)
    cy_acc = center_y + mid_r * math.sin(rad_accent)
    dot_r = stroke_w * 0.38
    c_draw.ellipse([cx_acc - dot_r, cy_acc - dot_r, cx_acc + dot_r, cy_acc + dot_r], fill=(56, 189, 248, 255))

    # Composite
    final_img = Image.alpha_composite(img, c_img)
    return final_img

def generate_all():
    os.makedirs('assets', exist_ok=True)
    master = draw_icon_high_res(1024)
    
    # Save 512x512
    icon512 = master.resize((512, 512), Image.Resampling.LANCZOS)
    icon512.save('assets/icon-512.png', 'PNG')
    
    # Save 192x192
    icon192 = master.resize((192, 192), Image.Resampling.LANCZOS)
    icon192.save('assets/icon-192.png', 'PNG')
    
    print('Generated icon-192.png & icon-512.png successfully')

if __name__ == '__main__':
    generate_all()
