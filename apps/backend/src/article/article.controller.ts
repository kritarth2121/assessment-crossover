import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserDec } from '../user/user.decorator';
import { IArticleRO, IArticlesRO, ICommentsRO } from './article.interface';
import { ArticleService } from './article.service';
import { CreateArticleDto, CreateCommentDto } from './dto';
import { UserService } from '../user/user.service';
import { IArticleLockRO } from '@realworld/articles/article-edit';

@ApiBearerAuth()
@ApiTags('articles')
@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService, private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get all articles' })
  @ApiResponse({ status: 200, description: 'Return all articles.' })
  @Get()
  async findAll(@UserDec('id') user: number, @Query() query: Record<string, string>): Promise<IArticlesRO> {
    return this.articleService.findAll(+user, query);
  }

  @Get('/lock')
  async lock(
    @Query('username') username: string,
    @Query('articleSlug') articleSlug: string,
    @Query('lock') lock: string,
  ): Promise<IArticleLockRO> {
    return this.articleService.lock(username, articleSlug, lock);
  }

  @ApiOperation({ summary: 'Get article feed' })
  @ApiResponse({ status: 200, description: 'Return article feed.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Get('feed')
  async getFeed(@UserDec('id') userId: number, @Query() query: Record<string, string>): Promise<IArticlesRO> {
    return this.articleService.findFeed(+userId, query);
  }

  @Get(':slug')
  async findOne(@UserDec('id') userId: number, @Param('slug') slug: string): Promise<any> {
    return this.articleService.findOne(userId, { slug });
  }

  @Get(':slug/comments')
  async findComments(@Param('slug') slug: string): Promise<ICommentsRO> {
    return this.articleService.findComments(slug);
  }

  @ApiOperation({ summary: 'Create article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully created.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post()
  async create(@UserDec('id') userId: number, @Body('article') articleData: CreateArticleDto) {
    return this.articleService.create(userId, articleData);
  }

  @ApiOperation({ summary: 'Update article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully updated.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Put(':slug')
  async update(
    @UserDec('id') user: number,
    @Param() params: Record<string, string>,
    @Body('article') articleData: CreateArticleDto,
  ) {
    // Todo: update slug also when title gets changed
    return this.articleService.update(+user, params.slug, articleData);
  }

  @ApiOperation({ summary: 'Delete article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Delete(':slug')
  async delete(@Param() params: Record<string, string>) {
    return this.articleService.delete(params.slug);
  }

  @ApiOperation({ summary: 'Create comment' })
  @ApiResponse({ status: 201, description: 'The comment has been successfully created.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post(':slug/comments')
  async createComment(
    @UserDec('id') user: number,
    @Param('slug') slug: string,
    @Body('comment') commentData: CreateCommentDto,
  ) {
    return this.articleService.addComment(user, slug, commentData);
  }

  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({ status: 201, description: 'The article has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Delete(':slug/comments/:id')
  async deleteComment(@UserDec('id') user: number, @Param() params: Record<string, string>) {
    const { slug, id } = params;
    return this.articleService.deleteComment(+user, slug, +id);
  }

  @ApiOperation({ summary: 'Favorite article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully favorited.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Post(':slug/favorite')
  async favorite(@UserDec('id') userId: number, @Param('slug') slug: string) {
    return this.articleService.favorite(userId, slug);
  }

  @ApiOperation({ summary: 'Unfavorite article' })
  @ApiResponse({ status: 201, description: 'The article has been successfully unfavorited.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Delete(':slug/favorite')
  async unFavorite(@UserDec('id') userId: number, @Param('slug') slug: string) {
    return this.articleService.unFavorite(userId, slug);
  }
}
