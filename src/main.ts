/**
 * AI 小镇 - 主入口文件
 */

import { Game } from './core/Game';

async function main() {
  console.log('🏘️ AI 小镇启动中...');

  try {
    // 获取 canvas 元素
    const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('未找到 canvas 元素');
    }

    // 创建游戏实例
    const game = new Game(canvas);

    // 初始化游戏
    await game.init();

    // 更新状态显示
    updateStatus('就绪');

    // 设置控制按钮
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        game.start();
        updateStatus('运行中');
        startBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'inline-block';
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        game.pause();
        updateStatus('已暂停');
        pauseBtn.style.display = 'none';
        if (startBtn) startBtn.style.display = 'inline-block';
      });
    }

    console.log('✅ AI 小镇初始化完成');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    showError(error instanceof Error ? error.message : '未知错误');
  }
}

function updateStatus(status: string) {
  const statusElement = document.getElementById('system-status');
  if (statusElement) {
    statusElement.textContent = status;
  }
}

function showError(message: string) {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = `错误: ${message}`;
    errorElement.style.display = 'block';
  }
  updateStatus('错误');
}

// 启动应用
main();
