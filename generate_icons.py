import os
import math
from PIL import Image, ImageDraw

def draw_icon_high_res(size=1024):
    # Create image with transparent RGBA background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center_x, center_y = size / 2, size / 2
    radius = (size / 2) * 0.92
    
    # 1. Pure Circle Outer Background (Dark Navy)
    bbox_circle = [center_x - radius, center_y - radius, center_x + radius, center_y + radius]
    draw.ellipse(bbox_circle, fill=(15, 23, 42, 255))
    
    # Glowing Ring Border Inside Circle
    ring_radius = radius * 0.94
    bbox_ring = [center_x - ring_radius, center_y - ring_radius, center_x + ring_radius, center_y + ring_radius]
    draw.ellipse(bbox_ring, outline=(37, 99, 235, 220), width=int(size * 0.025))
    
    # Secondary Cyan Glow Ring
    ring_radius2 = radius * 0.91
    bbox_ring2 = [center_x - ring_radius2, center_y - ring_radius2, center_x + ring_radius2, center_y + ring_radius2]
    draw.ellipse(bbox_ring2, outline=(56, 189, 248, 140), width=int(size * 0.01))
    
    # 2. Iconic Letter 'C' in exact center
    outer_r = size * 0.25
    stroke_w = size * 0.095
    
    c_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(c_img)
    
    bbox_outer = [center_x - outer_r, center_y - outer_r, center_x + outer_r, center_y + outer_r]
    
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
        
    # Accent cyan dot at upper right end of 'C'
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
    
    print('Generated pure circular icons icon-192.png & icon-512.png successfully')

if __name__ == '__main__':
    generate_all()
