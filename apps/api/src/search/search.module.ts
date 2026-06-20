import { Global, Module } from '@nestjs/common';
import { OpenSearchClient } from './opensearch.client';
import { SearchService } from './search.service';

@Global()
@Module({
  providers: [OpenSearchClient, SearchService],
  exports: [SearchService],
})
export class SearchModule {}
