import lastErrand from './last-errand.ink?raw';

export interface StoryEntry {
  id: string;
  title: string;
  source: string;
}

// Чтобы добавить сценарий: положи .ink в эту папку и допиши строку ниже.
export const STORIES: StoryEntry[] = [
  { id: 'last-errand', title: 'Last Errand · День 1', source: lastErrand },
];
