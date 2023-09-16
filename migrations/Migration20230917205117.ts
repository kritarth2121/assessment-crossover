import { Migration } from '@mikro-orm/migrations';

export class Migration20230917205117 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table `article` add `main_author_id` int unsigned not null;');
    this.addSql(
      'alter table `article` add constraint `article_main_author_id_foreign` foreign key (`main_author_id`) references `user` (`id`) on update cascade;',
    );
    this.addSql('alter table `article` add index `article_main_author_id_index`(`main_author_id`);');
  }

  async down(): Promise<void> {
    this.addSql('alter table `article` drop foreign key `article_main_author_id_foreign`;');

    this.addSql('alter table `article` drop index `article_main_author_id_index`;');
    this.addSql('alter table `article` drop `main_author_id`;');
  }
}
