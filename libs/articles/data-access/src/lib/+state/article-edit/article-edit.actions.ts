import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const articleEditActions = createActionGroup({
  source: 'Article Edit',
  events: {
    publishArticle: emptyProps(),
    publishArticleSuccess: emptyProps(),
  },
});
