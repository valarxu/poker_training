from PIL import Image, ImageDraw, ImageFont
import os

# 创建images目录
if not os.path.exists('public/images'):
    os.makedirs('public/images')

# 卡牌尺寸
CARD_WIDTH = 500
CARD_HEIGHT = 700
CORNER_RADIUS = 20

# 颜色定义
RED = '#FF0000'
BLACK = '#000000'
WHITE = '#FFFFFF'
BLUE = '#000080'

def create_rounded_rectangle(draw, coords, radius, fill):
    """绘制圆角矩形"""
    x1, y1, x2, y2 = coords
    draw.rectangle([x1+radius, y1, x2-radius, y2], fill=fill)
    draw.rectangle([x1, y1+radius, x2, y2-radius], fill=fill)
    draw.ellipse([x1, y1, x1+2*radius, y1+2*radius], fill=fill)
    draw.ellipse([x2-2*radius, y1, x2, y1+2*radius], fill=fill)
    draw.ellipse([x1, y2-2*radius, x1+2*radius, y2], fill=fill)
    draw.ellipse([x2-2*radius, y2-2*radius, x2, y2], fill=fill)

def create_card(rank, suit):
    """创建单张扑克牌"""
    # 创建空白图片
    img = Image.new('RGB', (CARD_WIDTH, CARD_HEIGHT), WHITE)
    draw = ImageDraw.Draw(img)
    
    # 绘制卡牌边框
    create_rounded_rectangle(draw, (10, 10, CARD_WIDTH-10, CARD_HEIGHT-10), CORNER_RADIUS, WHITE)
    draw.rectangle([15, 15, CARD_WIDTH-15, CARD_HEIGHT-15], outline=BLACK, width=2)
    
    # 设置字体 - 增大字体大小
    try:
        font_large = ImageFont.truetype("arial.ttf", 200)  # 增大中央花色的字体
        font_small = ImageFont.truetype("arial.ttf", 100)  # 增大角落点数和花色的字体
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # 确定颜色 - 使用更鲜明的颜色
    color = RED if suit in ['hearts', 'diamonds'] else BLACK
    
    # 绘制花色符号
    suit_symbols = {
        'hearts': '♥',
        'diamonds': '♦',
        'clubs': '♣',
        'spades': '♠'
    }
    
    # 左上角和右下角的点数和花色 - 位置调整以适应更大的字体
    draw.text((30, 30), rank, fill=color, font=font_small)
    draw.text((30, 130), suit_symbols[suit], fill=color, font=font_small)
    draw.text((CARD_WIDTH-130, CARD_HEIGHT-200), rank, fill=color, font=font_small)
    draw.text((CARD_WIDTH-130, CARD_HEIGHT-100), suit_symbols[suit], fill=color, font=font_small)
    
    # 中央的大号花色 - 位置调整以居中
    draw.text((CARD_WIDTH//2-100, CARD_HEIGHT//2-100), suit_symbols[suit], fill=color, font=font_large)
    
    return img

def create_card_back():
    """创建卡牌背面"""
    img = Image.new('RGB', (CARD_WIDTH, CARD_HEIGHT), WHITE)
    draw = ImageDraw.Draw(img)
    
    # 绘制圆角边框
    create_rounded_rectangle(draw, (10, 10, CARD_WIDTH-10, CARD_HEIGHT-10), CORNER_RADIUS, BLUE)
    
    # 绘制花纹 - 使用更大的花纹
    for i in range(0, CARD_WIDTH, 50):  # 增大间距
        for j in range(0, CARD_HEIGHT, 50):  # 增大间距
            draw.rectangle([i, j, i+25, j+25], fill=WHITE)  # 增大花纹大小
    
    return img

def main():
    # 生成所有卡牌
    suits = ['hearts', 'diamonds', 'clubs', 'spades']
    ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    
    for suit in suits:
        for rank in ranks:
            card = create_card(rank, suit)
            card.save(f'public/images/{rank}_of_{suit}.png')
            print(f'Generated {rank} of {suit}')
    
    # 生成卡牌背面
    card_back = create_card_back()
    card_back.save('public/images/card-back.png')
    print('Generated card back')

if __name__ == '__main__':
    main() 