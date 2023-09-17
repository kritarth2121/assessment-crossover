import { Component, Input, ChangeDetectionStrategy, EventEmitter, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Article } from '@realworld/core/api-types';
import { Store } from '@ngrx/store';
import { selectUser } from '../../../../../auth/data-access/src';

@Component({
  selector: 'cdt-article-meta',
  standalone: true,
  templateUrl: './article-meta.component.html',
  styleUrls: ['./article-meta.component.css'],
  imports: [RouterModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleMetaComponent {
  @Input() article!: Article;
  @Input() isAuthenticated!: boolean;
  @Input() canModify!: boolean;
  @Output() follow: EventEmitter<string> = new EventEmitter<string>();
  @Output() unfollow: EventEmitter<string> = new EventEmitter<string>();
  @Output() unfavorite: EventEmitter<string> = new EventEmitter();
  @Output() favorite: EventEmitter<string> = new EventEmitter();
  @Output() delete: EventEmitter<string> = new EventEmitter();
  constructor(private readonly store: Store) {}

  toggleFavorite() {
    if (this.article.favorited) {
      this.unfavorite.emit(this.article.slug);
    } else {
      this.favorite.emit(this.article.slug);
    }
  }
  user$ = this.store.select(selectUser);

  toggleFollow(autherName?: string) {
    const author = this.article.authors.filter((a) => a.username === autherName);
    if (author.length > 0) {
      if (author[0].following) {
        this.unfollow.emit(autherName);
      } else {
        this.follow.emit(autherName);
      }
    }
  }

  deleteArticle() {
    this.delete.emit(this.article.slug);
  }
}
