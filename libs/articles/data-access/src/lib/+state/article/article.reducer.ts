import { Article, Comment } from '@realworld/core/api-types';
import { createFeature, createReducer, on } from '@ngrx/store';
import { articleActions } from './article.actions';
import { articlesActions } from '../articles.actions';
import { articleEditActions } from '../article-edit/article-edit.actions';

export interface ArticleState {
  data: Article;
  comments: Comment[];
  loading: boolean;
  loaded: boolean;
}

export const articleInitialState: ArticleState = {
  data: {
    slug: '',
    title: '',
    description: '',
    body: '',
    tagList: [],
    createdAt: '',
    updatedAt: '',
    favorited: false,
    favoritesCount: 0,
    authors: [
      {
        username: '',
        bio: '',
        image: '',
        following: false,
        loading: false,
      },
    ],
  },
  comments: [],
  loaded: false,
  loading: false,
};

export const articleFeature = createFeature({
  name: 'article',
  reducer: createReducer(
    articleInitialState,
    on(articleActions.loadArticleSuccess, (state, action) => ({
      ...state,
      data: action.article,
      loaded: true,
      loading: false,
    })),
    on(articleActions.loadArticleFailure, (state) => ({
      ...state,
      data: articleInitialState.data,
      loaded: false,
      loading: false,
    })),
    on(articleActions.addCommentSuccess, (state, action) => {
      const comments: Comment[] = [action.comment, ...state.comments];
      return { ...state, comments };
    }),
    on(articleActions.deleteCommentSuccess, (state, action) => {
      const comments: Comment[] = state.comments.filter((item) => item.id !== action.commentId);
      return { ...state, comments };
    }),
    on(
      articleActions.initializeArticle,
      articleEditActions.publishArticleSuccess,
      articleActions.deleteArticleFailure,
      (state) => articleInitialState,
    ),
    on(articleActions.loadCommentsSuccess, (state, action) => ({
      ...state,
      comments: action.comments,
    })),
    on(articleActions.loadCommentsFailure, (state) => ({
      ...state,
      comments: articleInitialState.comments,
    })),
    on(articleActions.followSuccess, articleActions.unfollowSuccess, (state, action) => {
      var data: Article = { ...state.data };
      // replace the author with the updated one
      data.authors = data.authors.map((author) => {
        if (author.username === action.profile.username) {
          return action.profile;
        }
        return author;
      });
      return { ...state, data };
    }),
    on(articlesActions.favoriteSuccess, articlesActions.unfavoriteSuccess, (state, action) => ({
      ...state,
      data: action.article,
    })),
  ),
});
