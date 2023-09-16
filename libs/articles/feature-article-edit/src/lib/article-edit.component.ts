import { DynamicFormComponent, Field, formsActions, ListErrorsComponent, ngrxFormsQuery } from '@realworld/core/forms';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { Validators, FormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { articleActions, articleEditActions, articleQuery } from '@realworld/articles/data-access';
import { ApiService } from '@realworld/core/http-client';
import { selectAuthState, selectLoggedIn, selectUser } from '@realworld/auth/data-access';
import { filter } from 'rxjs/operators';

export interface IArticleLockRO {
  msg: string;
}
const structure: Field[] = [
  {
    type: 'INPUT',
    name: 'title',
    placeholder: 'Article Title',
    validator: [Validators.required],
  },
  {
    type: 'INPUT',
    name: 'description',
    placeholder: "What's this article about?",
    validator: [Validators.required],
  },
  {
    type: 'TEXTAREA',
    name: 'body',
    placeholder: 'Write your article (in markdown)',
    validator: [Validators.required],
  },
  {
    type: 'INPUT',
    name: 'tagList',
    placeholder: 'Enter Tags',
    validator: [],
  },
  {
    type: 'INPUT',
    name: 'authorsCS',
    placeholder: 'Add Authors by email',
    validator: [],
  },
];

@UntilDestroy()
@Component({
  selector: 'cdt-article-edit',
  standalone: true,
  templateUrl: './article-edit.component.html',
  styleUrls: ['./article-edit.component.css'],
  imports: [DynamicFormComponent, ListErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent implements OnInit, OnDestroy {
  structure$ = this.store.select(ngrxFormsQuery.selectStructure);
  data$ = this.store.select(ngrxFormsQuery.selectData);

  didLock = true;
  lockingUser = '';
  slug = '';

  constructor(private readonly store: Store, private apiService: ApiService) {}

  ngOnInit() {
    this.store.dispatch(formsActions.setStructure({ structure }));
    // get the article id from data
    this.store
      .select(articleQuery.selectData)
      .pipe(untilDestroyed(this))
      .subscribe((article) => {
        console.log('article.slug: ', article.slug);
        this.slug = article.slug;
        this.store
          .select(selectAuthState)
          .pipe(
            filter((auth) => auth.loggedIn),
            untilDestroyed(this),
          )
          .subscribe((auth) => {
            console.log('username: ', auth.user.username);
            this.lockingUser = auth.user.username;

            this.apiService
              .get<IArticleLockRO>(
                `/articles/lock?articleSlug=${article.slug}&username=${auth.user.username}&lock=true`,
              )
              .pipe(untilDestroyed(this))
              .subscribe((response: IArticleLockRO) => {
                console.log('response: ', response);

                if (response.msg === 'locked') {
                  this.didLock = false;
                  console.log('article locked');
                } else {
                  this.didLock = true;
                }
                this.initForm();
              });
          });
      });
  }
  initForm() {
    this.store
      .select(articleQuery.selectData)
      .pipe(untilDestroyed(this))
      .subscribe((article) => this.store.dispatch(formsActions.setData({ data: article })));
  }

  updateForm(changes: any) {
    if (this.didLock) {
      this.renewLock();
      this.store.dispatch(formsActions.updateData({ data: changes }));
    }
  }

  submit() {
    if (this.didLock) {
      this.store.dispatch(articleEditActions.publishArticle());
    }
  }

  ngOnDestroy() {
    this.store.dispatch(formsActions.initializeForm());

    if (this.didLock && this.slug !== '' && this.lockingUser !== '') {
      console.log('article should unlock');
      this.apiService
        .get<IArticleLockRO>(`/articles/lock?articleSlug=${this.slug}&username=${this.lockingUser}&lock=false`)
        .pipe()
        .subscribe((response: IArticleLockRO) => {
          console.log('response: ', response);
          if (response.msg === 'unlocked') {
            console.log('article unlocked');
          }
        });
    }
    this.didLock = true;
    this.lockingUser = '';
    this.slug = '';
  }

  renewLock() {
    if (this.didLock && this.slug !== '' && this.lockingUser !== '') {
      console.log('activity renews lock');
      this.apiService
        .get<IArticleLockRO>(`/articles/lock?articleSlug=${this.slug}&username=${this.lockingUser}&lock=true`)
        .pipe()
        .subscribe((response: IArticleLockRO) => {
          console.log('response: ', response);
          // response is only true if lock was newly acquired
          // response is false for merely renewing lock
        });
    }
  }
}
