/**
 * WebGPU 渲染器 - 负责图形渲染
 */

export class Renderer {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private canvas: HTMLCanvasElement | null = null;

  /**
   * 初始化 WebGPU 渲染器
   */
  async init(canvas: HTMLCanvasElement): Promise<void> {
    console.log('初始化 WebGPU 渲染器...');

    this.canvas = canvas;

    // 检查浏览器是否支持 WebGPU
    if (!navigator.gpu) {
      throw new Error('您的浏览器不支持 WebGPU。请使用 Chrome 113+ 或 Edge 113+');
    }

    // 请求 GPU 适配器
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('无法获取 GPU 适配器');
    }

    // 请求 GPU 设备
    this.device = await adapter.requestDevice();
    console.log('GPU 设备已获取:', this.device);

    // 配置 Canvas 上下文
    this.context = canvas.getContext('webgpu');
    if (!this.context) {
      throw new Error('无法获取 WebGPU 上下文');
    }

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: canvasFormat,
      alphaMode: 'premultiplied',
    });

    console.log('WebGPU 渲染器初始化完成');
  }

  /**
   * 渲染一帧
   */
  render(): void {
    if (!this.device || !this.context) {
      return;
    }

    // 创建命令编码器
    const commandEncoder = this.device.createCommandEncoder();

    // 获取当前纹理视图
    const textureView = this.context.getCurrentTexture().createView();

    // 创建渲染通道
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.9, g: 0.95, b: 0.98, a: 1.0 }, // 浅蓝色背景
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    
    // 这里将来会添加实际的渲染命令：
    // - 渲染地图
    // - 渲染角色
    // - 渲染建筑物
    // - 渲染 UI 元素
    
    passEncoder.end();

    // 提交命令
    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    // WebGPU 资源会自动清理
    this.device = null;
    this.context = null;
    this.canvas = null;
    
    console.log('渲染器已销毁');
  }
}
