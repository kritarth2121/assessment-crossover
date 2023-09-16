import { Injectable } from '@nestjs/common';
import { EntityManager, QueryOrder, t, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { setTimeout, clearTimeout } from 'node:timers';

import { User } from '../user/user.entity';
import { Article } from './article.entity';
import { IArticleRO, IArticlesRO, ICommentsRO } from './article.interface';
import { Comment } from './comment.entity';
import { CreateArticleDto, CreateCommentDto } from './dto';
import { Tag } from '../tag/tag.entity';
import { IArticleLockRO } from '@realworld/articles/article-edit';

@Injectable()
export class ArticleService {
  private unlockTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Article)
    private readonly articleRepository: EntityRepository<Article>,
    @InjectRepository(Comment)
    private readonly commentRepository: EntityRepository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
  ) {}

  async likesArticlesDate(authorID: number): Promise<[number, number, string]> {
    const qb = this.articleRepository.createQueryBuilder('a').select('a.*').leftJoinAndSelect('a.authors', 'authors');
    qb.andWhere({ authors: authorID });

    // Execute the query and get the result
    const result = await qb.getResult();

    // iterate all elements of result and sum up the favoritesCount
    const likes = result.reduce((sum, article) => sum + article.favoritesCount, 0);
    var publishedFirst = '';

    // create a date object with today's date plus 1000 years
    const today = new Date();
    const future = new Date(today.getFullYear() + 1000, today.getMonth(), today.getDate());

    // iterate all elements of result and get the earliest createdAt
    const earliest = result.reduce((earliest, article) => {
      return article.createdAt < earliest ? article.createdAt : earliest;
    }, future);

    if (earliest < future) {
      publishedFirst = earliest.toISOString();
    }

    return [likes, result.length, publishedFirst];
  }

  async lock(username: string, articleSlug: string, should_lock: string): Promise<IArticleLockRO> {
    const unlockTimeout = 5 * 60 * 1000;
    const user = await this.userRepository.findOne({ username });
    const article = await this.articleRepository.findOne({ slug: articleSlug }, { populate: ['authors'] });

    var response = 'failed';
    if (user && article) {
      if (should_lock === 'true') {
        if (article.locked_by_user_id === null) {
          article.locked_by_user_id = user.id;
          response = 'acquired';
        } else if (article.locked_by_user_id === user.id) {
          response = 'renewed';
        }
        if (response !== 'failed') {
          article.last_activity_time = new Date();
          await this.em.flush();

          // Schedule the unlock operation after 5 minutes
          const unlockTimer = setTimeout(async () => {
            // Check if there's still no activity
            if (article.last_activity_time && Date.now() - article.last_activity_time.getTime() >= unlockTimeout) {
              article.locked_by_user_id = null;
              await this.em.flush();
              console.log('///////////////////////// article unlocked');
            }
          }, unlockTimeout);

          // Store the timer in the map
          this.unlockTimers.set(articleSlug, unlockTimer);
        }
        else {
          response = 'locked';
        }
      } else {
        if (article.locked_by_user_id === user.id) {
          article.locked_by_user_id = null;
          await this.em.flush();
          response = 'unlocked';
        }
        else {
          response = 'locked';
        }
      }
    }

    return { msg: response };
  }

  async findAll(userId: number, query: Record<string, string>): Promise<IArticlesRO> {
    const user = userId
      ? await this.userRepository.findOne(userId, { populate: ['followers', 'favorites'] })
      : undefined;

    const qb = this.articleRepository.createQueryBuilder('a').select('a.*').leftJoinAndSelect('a.authors', 'authors');

    if ('tag' in query) {
      qb.andWhere({ tagList: new RegExp(query.tag) });
    }

    if ('author' in query) {
      const author = await this.userRepository.findOne({ username: query.author });

      if (!author) {
        return { articles: [], articlesCount: 0 };
      }

      qb.andWhere({ authors: author.id });
    }

    if ('favorited' in query) {
      const author = await this.userRepository.findOne({ username: query.favorited }, { populate: ['favorites'] });

      if (!author) {
        return { articles: [], articlesCount: 0 };
      }

      const ids = author.favorites.$.getIdentifiers();
      qb.andWhere({ authors: ids });
    }

    qb.orderBy({ createdAt: QueryOrder.DESC });
    const res = await qb.clone().count('id', true).execute('get');
    const articlesCount = res.count;

    if ('limit' in query) {
      qb.limit(+query.limit);
    }

    if ('offset' in query) {
      qb.offset(+query.offset);
    }

    const articles = await qb.getResult();
    //  const articles = await this.articleRepository.findAll({ populate: ['authors'] });

    return { articles: articles.map((a) => a.toJSON(user!)), articlesCount };
  }

  async findFeed(userId: number, query: Record<string, string>): Promise<IArticlesRO> {
    const user = userId
      ? await this.userRepository.findOne(userId, { populate: ['followers', 'favorites'] })
      : undefined;
    const res = await this.articleRepository.findAndCount(
      { authors: { followers: userId } },
      {
        populate: ['authors'],
        orderBy: { createdAt: QueryOrder.DESC },
        limit: +query.limit,
        offset: +query.offset,
      },
    );

    console.log('findFeed', { articles: res[0], articlesCount: res[1] });
    return { articles: res[0].map((a) => a.toJSON(user!)), articlesCount: res[1] };
  }

  async findOne(userId: number, where: Partial<Article>): Promise<IArticleRO> {
    const user = userId
      ? await this.userRepository.findOneOrFail(userId, { populate: ['followers', 'favorites'] })
      : undefined;
    const article = await this.articleRepository.findOne(where, { populate: ['authors'] });
    return { article: article && article.toJSON(user) } as IArticleRO;
  }

  async addComment(userId: number, slug: string, dto: CreateCommentDto) {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['authors'] });
    const author = await this.userRepository.findOneOrFail(userId);
    const comment = new Comment(author, article, dto.body);
    await this.em.persistAndFlush(comment);

    return { comment, article: article.toJSON(author) };
  }

  async deleteComment(userId: number, slug: string, id: number): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['authors'] });
    const user = await this.userRepository.findOneOrFail(userId);
    const comment = this.commentRepository.getReference(id);

    if (article.comments.contains(comment)) {
      article.comments.remove(comment);
      await this.em.removeAndFlush(comment);
    }

    return { article: article.toJSON(user) };
  }

  async favorite(id: number, slug: string): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['authors'] });
    const user = await this.userRepository.findOneOrFail(id, { populate: ['favorites', 'followers'] });

    if (!user.favorites.contains(article)) {
      user.favorites.add(article);
      article.favoritesCount++;
    }

    await this.em.flush();
    return { article: article.toJSON(user) };
  }

  async unFavorite(id: number, slug: string): Promise<IArticleRO> {
    const article = await this.articleRepository.findOneOrFail({ slug }, { populate: ['authors'] });
    const user = await this.userRepository.findOneOrFail(id, { populate: ['followers', 'favorites'] });

    if (user.favorites.contains(article)) {
      user.favorites.remove(article);
      article.favoritesCount--;
    }

    await this.em.flush();
    return { article: article.toJSON(user) };
  }

  async findComments(slug: string): Promise<ICommentsRO> {
    const article = await this.articleRepository.findOne({ slug }, { populate: ['comments'] });
    return { comments: article!.comments.getItems() };
  }

  async create(userId: number, dto: CreateArticleDto) {
    const user = await this.userRepository.findOne(
      { id: userId },
      { populate: ['followers', 'favorites', 'articles'] },
    );
    const article = new Article(user!, dto.title, dto.description, dto.body);
    // changed type of tagList to string in CreateArticleDto
    const tags = dto.tagList.split(',').map((tag) => tag.trim());
    article.tagList.push(...tags);

    // q: how do i store each tag in the database?
    // a: use this.em.create() to create a Tag object
    // q: how do I call this.em.create() on each element of tags array?
    // a: use .map() to create an array of Tag objects
    // q: can you write me that code?
    // a: sure, here you go:
    const tagObjects = tags.map((tag) => this.em.create(Tag, { tag }));

    user?.articles.add(article);
    await this.em.flush();

    return { article: article.toJSON(user!) };
  }

  async update(userId: number, slug: string, articleData: any): Promise<IArticleRO> {
    const user = await this.userRepository.findOne(
      { id: userId },
      { populate: ['followers', 'favorites', 'articles'] },
    );
    const article = await this.articleRepository.findOne({ slug }, { populate: ['authors'] });

    // if articleData has property authors, assign it to a constant
    const { authorsCS, authors, createdAt, locked_by_user_id, last_activity_time, ...data } = articleData;
    // if authors is defined
    if (authorsCS && article && typeof authorsCS === 'string') {
      const author_mails = authorsCS.split(',').map((author_email) => {
        const mail = author_email.trim();
        return mail;
      });

      for (const mail of author_mails) {
        const u = await this.userRepository.findOne({ email: mail });

        if (u) {
          article.authors.add(u);

          console.log('///////////////////////// data:', data);
          console.log('///////////////////////// added:', u.email, u.username, 'to authors');
        }
      }
    }

    wrap(article).assign(data);
    await this.em.flush();

    return { article: article!.toJSON(user!) };
  }

  async delete(slug: string) {
    return this.articleRepository.nativeDelete({ slug });
  }
}
