import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'albumFilter'
})
export class AlbumFilterPipe implements PipeTransform {

  transform(items: any, args?: string): any {
    if (!items || !args) {
      return items;
    }

    if (args === 'albums') {
      return items.filter(item => !item.attributes.isSingle);
    }

    if (args === 'singles') {
      return items.filter(item => item.attributes.isSingle === true);
    }

    if (args === 'releaseDateAsc') {
      return items.sort((a, b) => new Date(a.attributes.releaseDate).getTime() - new Date(b.attributes.releaseDate).getTime());
    }

    if (args === 'releaseDateDesc') {
      return items.sort((a, b) => new Date(b.attributes.releaseDate).getTime() - new Date(a.attributes.releaseDate).getTime());
    }

    if (args === 'latestRelease') {
      items = items.filter(item => item.attributes.isSingle === false && new Date(item.attributes.releaseDate).getTime() < Date.now());
      return items.sort((a, b) => new Date(b.attributes.releaseDate).getTime() - new Date(a.attributes.releaseDate).getTime())[0];
    }

    if (args === 'upcomingRelease') {
      return items.filter(item => new Date(item.attributes.releaseDate).getTime() > Date.now())[0];
    }
  }

}
