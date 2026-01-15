/**
 * 游戏核心类 - 负责整体游戏循环和系统协调
 */

import { Renderer } from '../webgpu/Renderer';

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private lastFrameTime: number = 0;
  private gameTime: number = 0; // 游戏时间（毫秒）

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * 初始化游戏
   */
  async init(): Promise<void> {
    console.log('初始化游戏核心...');

    // 初始化渲染器
    this.renderer = new Renderer();
    await this.renderer.init(this.canvas);

    // 这里将来会初始化其他系统：
    // - SystemManager
    // - CharacterSystem
    // - EconomySystem
    // - etc.

    console.log('游戏核心初始化完成');
  }

  /**
   * 启动游戏循环
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    
    console.log('游戏开始运行');
    this.gameLoop();
  }

  /**
   * 暂停游戏
   */
  pause(): void {
    this.isPaused = true;
    console.log('游戏已暂停');
  }

  /**
   * 恢复游戏
   */
  resume(): void {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    console.log('游戏已恢复');
    this.gameLoop();
  }

  /**
   * 主游戏循环
   */
  private gameLoop = (): void => {
    if (!this.isRunning || this.isPaused) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // 更新游戏时间
    this.gameTime += deltaTime;

    // 更新游戏逻辑
    this.update(deltaTime);

    // 渲染
    this.render();

    // 更新 UI
    this.updateUI();

    // 继续循环
    requestAnimationFrame(this.gameLoop);
  };

  /**
   * 更新游戏逻辑
   */
  private update(deltaTime: number): void {
    // 这里将来会更新所有系统：
    // - SystemManager.update(deltaTime)
    // - CharacterSystem.update(deltaTime)
    // - FarmingSystem.update(deltaTime)
    // - etc.
  }

  /**
   * 渲染游戏画面
   */
  private render(): void {
    if (this.renderer) {
      this.renderer.render();
    }
  }

  /**
   * 更新 UI 显示
   */
  private updateUI(): void {
    // 更新游戏时间显示
    const gameTimeElement = document.getElementById('game-time');
    if (gameTimeElement) {
      const hours = Math.floor(this.gameTime / 3600000);
      const minutes = Math.floor((this.gameTime % 3600000) / 60000);
      gameTimeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // 更新角色数量（暂时显示 0）
    const characterCountElement = document.getElementById('character-count');
    if (characterCountElement) {
      characterCountElement.textContent = '0'; // 将来从 CharacterSystem 获取
    }
  }

  /**
   * 获取当前游戏时间
   */
  getGameTime(): number {
    return this.gameTime;
  }

  /**
   * 销毁游戏实例
   */
  destroy(): void {
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    console.log('游戏已销毁');
  }
}
