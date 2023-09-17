import {
  ArrayType,
  Collection,
  Entity,
  EntityDTO,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  wrap,
} from '@mikro-orm/core';
import slug from 'slug';

import { User, UserDTO } from '../user/user.entity';
import { Comment } from './comment.entity';
import { UserRepository } from '../user/user.repository';

@Entity()
export class Article {
  @PrimaryKey({ type: 'number' })
  id: number;

  @Property()
  slug: string;

  @Property()
  title: string;

  @Property()
  description = '';

  @Property()
  body = '';

  @Property({ type: 'date' })
  createdAt = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: ArrayType })
  tagList: string[] = [];

  @ManyToMany({
    entity: () => User,
    inversedBy: (u) => u.articles,
    owner: true,
    pivotTable: 'article_authors',
    joinColumn: 'article_id',
    inverseJoinColumn: 'user_id',
    hidden: true,
  })
  authors = new Collection<User>(this);

  @ManyToOne(() => User)
  main_author: User;

  @OneToMany(() => Comment, (comment) => comment.article, { eager: true, orphanRemoval: true })
  comments = new Collection<Comment>(this);

  @Property({ type: 'number' })
  favoritesCount = 0;

  // Add the 'locked_by_user_id' field
  @Property({ type: 'number', nullable: true }) // Allows storing user ID or NULL
  locked_by_user_id: number | null;

  // Add the 'last_activity_time' field
  @Property({ type: 'timestamp', nullable: true }) // Allows storing timestamps or NULL
  last_activity_time: Date | null;

  constructor(author: User, title: string, description: string, body: string) {
    this.authors.add(author);
    this.main_author = author;
    this.title = title;
    this.description = description;
    this.body = body;
    this.slug = slug(title, { lower: true }) + '-' + ((Math.random() * Math.pow(36, 6)) | 0).toString(36);
  }

  toJSON(user?: User) {
    const o = wrap<Article>(this).toObject() as any;
    // o.favorited = user && user.favorites.isInitialized() ? user.favorites.contains(this) : false;
    o.main_author = this.main_author.toJSON();
    console.log(this);
    o.authors = this.authors?.isInitialized() ? this.authors.getItems().map((a) => a?.toJSON()) : [];
    return o;
  }
}

export interface ArticleDTO extends EntityDTO<Article> {
  favorited?: boolean;
}
