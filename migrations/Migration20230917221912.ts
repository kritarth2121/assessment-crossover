import { Migration } from '@mikro-orm/migrations';

export class Migration20230917221912 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table `article` add `locked_user_id` int unsigned not null;');
    this.addSql(
      'alter table `article` add constraint `article_locked_user_id_foreign` foreign key (`locked_user_id`) references `user` (`id`) on update cascade;',
    );
    this.addSql('alter table `article` add index `article_locked_user_id_index`(`locked_user_id`);');
  }

  async down(): Promise<void> {
    this.addSql('alter table `article` drop foreign key `article_locked_user_id_foreign`;');

    this.addSql('alter table `article` drop index `article_locked_user_id_index`;');
    this.addSql('alter table `article` drop `locked_user_id`;');
  }
}
