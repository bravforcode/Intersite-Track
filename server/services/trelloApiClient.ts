import type {
  TrelloCard,
  TrelloChecklist,
  TrelloCheckItem,
  TrelloList,
  TrelloMember,
  TrelloWebhook,
  CreateCardData,
  CreateListData,
  UpdateCardData,
} from '../types/trello.js';

const BASE_URL = 'https://api.trello.com/1';

export class TrelloAPIClient {
  private apiKey: string;
  private token: string;

  constructor(apiKey: string, token: string) {
    this.apiKey = apiKey;
    this.token = token;
  }

  private authParams(): string {
    return `key=${encodeURIComponent(this.apiKey)}&token=${encodeURIComponent(this.token)}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}${this.authParams()}`;

    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let message: string;
      try {
        message = await response.text();
      } catch {
        message = response.statusText;
      }
      throw new Error(`Trello API error ${response.status}: ${message}`);
    }

    if (response.status === 200 || response.status === 201) {
      return response.json() as Promise<T>;
    }

    return undefined as unknown as T;
  }

  // ─── Card Operations ────────────────────────────────────────────────────────

  async createCard(data: CreateCardData): Promise<TrelloCard> {
    return this.request<TrelloCard>('POST', '/cards', data as unknown as Record<string, unknown>);
  }

  async updateCard(cardId: string, data: UpdateCardData): Promise<TrelloCard> {
    return this.request<TrelloCard>('PUT', `/cards/${cardId}`, data as Record<string, unknown>);
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.request<void>('DELETE', `/cards/${cardId}`);
  }

  async getCard(cardId: string): Promise<TrelloCard> {
    return this.request<TrelloCard>('GET', `/cards/${cardId}`);
  }

  // ─── Member Operations ──────────────────────────────────────────────────────

  async addMemberToCard(cardId: string, memberId: string): Promise<void> {
    await this.request<unknown>('POST', `/cards/${cardId}/idMembers`, { value: memberId });
  }

  async removeMemberFromCard(cardId: string, memberId: string): Promise<void> {
    await this.request<void>('DELETE', `/cards/${cardId}/idMembers/${memberId}`);
  }

  // ─── Checklist Operations ───────────────────────────────────────────────────

  async createChecklist(cardId: string, name: string): Promise<TrelloChecklist> {
    return this.request<TrelloChecklist>('POST', '/checklists', { idCard: cardId, name });
  }

  async addCheckItem(checklistId: string, name: string): Promise<TrelloCheckItem> {
    return this.request<TrelloCheckItem>('POST', `/checklists/${checklistId}/checkItems`, { name });
  }

  async updateCheckItem(
    cardId: string,
    checkItemId: string,
    state: 'complete' | 'incomplete'
  ): Promise<void> {
    await this.request<unknown>('PUT', `/cards/${cardId}/checkItem/${checkItemId}`, { state });
  }

  async deleteCheckItem(checklistId: string, checkItemId: string): Promise<void> {
    await this.request<void>('DELETE', `/checklists/${checklistId}/checkItems/${checkItemId}`);
  }

  // ─── Label Operations ───────────────────────────────────────────────────────

  async addLabelToCard(cardId: string, labelId: string): Promise<void> {
    await this.request<unknown>('POST', `/cards/${cardId}/idLabels`, { value: labelId });
  }

  async removeLabelFromCard(cardId: string, labelId: string): Promise<void> {
    await this.request<void>('DELETE', `/cards/${cardId}/idLabels/${labelId}`);
  }

  // ─── Board Operations ───────────────────────────────────────────────────────

  async getBoardLists(boardId: string): Promise<TrelloList[]> {
    return this.request<TrelloList[]>('GET', `/boards/${boardId}/lists`);
  }

  async getBoardMembers(boardId: string): Promise<TrelloMember[]> {
    return this.request<TrelloMember[]>('GET', `/boards/${boardId}/members`);
  }

  async createList(data: CreateListData): Promise<TrelloList> {
    return this.request<TrelloList>('POST', '/lists', data as unknown as Record<string, unknown>);
  }

  // ─── Webhook Operations ─────────────────────────────────────────────────────

  async createWebhook(callbackUrl: string, idModel: string): Promise<TrelloWebhook> {
    return this.request<TrelloWebhook>('POST', '/webhooks', {
      callbackURL: callbackUrl,
      idModel,
    });
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request<void>('DELETE', `/webhooks/${webhookId}`);
  }
}
