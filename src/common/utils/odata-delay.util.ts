/**
 * Утилита для задержки между запросами к OData API
 * Обеспечивает задержку в 10 секунд между запросами для снижения нагрузки на сервер 1С
 */

export class ODataDelayUtil {
  private static lastRequestTime: number = 0;
  private static readonly DELAY_MS = 10000; // 10 секунд

  /**
   * Выполняет задержку перед следующим запросом к OData
   * Если с последнего запроса прошло меньше 10 секунд, ждет оставшееся время
   */
  static async waitForNextRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.DELAY_MS) {
      const remainingDelay = this.DELAY_MS - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Выполняет задержку и возвращает Promise для использования в async/await
   */
  static async delay(): Promise<void> {
    await this.waitForNextRequest();
  }

  /**
   * Выполняет задержку каждые N записей при вставке данных в БД
   * @param currentIndex - текущий индекс записи (начиная с 0)
   * @param batchSize - размер батча для задержки (по умолчанию 20)
   */
  static async delayForBatch(currentIndex: number, batchSize: number = 20): Promise<void> {
    // Задержка каждые batchSize записей (начиная с 0)
    if (currentIndex > 0 && currentIndex % batchSize === 0) {
      await this.delay();
    }
  }
}

