import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MusicService } from '../music.service';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css']
})
export class SearchResultsComponent implements OnInit, OnDestroy {

  searchSubscription: Subscription;
  loading: boolean;
  searchTerm = '';
  searchHints: any;

  constructor(private route: ActivatedRoute, private router: Router, public musicService: MusicService) { }

  ngOnInit() {
    this.searchSubscription = this.route.queryParams.subscribe(params => {
      this.searchTerm = params['term'];
      this.loadSearchResults(this.searchTerm);
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription.unsubscribe();
  }

  async loadSearchResults(term) {
    this.loading = true;
    await this.search(term);
    this.loading = false;

    if (this.musicService.albums) {
      this.getItemRelationships(this.musicService.albums, 'albums');
    }
    if (this.musicService.songs) {
      this.getItemRelationships(this.musicService.songs, 'songs');
    }
    if (this.musicService.playlists) {
      this.getItemRelationships(this.musicService.playlists, 'playlists');
    }

    if (this.musicService.artists) {
      const promises = this.musicService.artists.map(this.getArtwork.bind(this));
      await Promise.all(promises);
    }
  }

  async search(term: string): Promise<any> {
    if (!this.route.snapshot.queryParams.term) {
      this.router.navigate(['/searchresults'], { queryParams: { term: term } });
    }

    if (term === '' || term === this.musicService.lastSearchTerm) {
      return;
    }

    this.musicService.artists = null;
    this.musicService.albums = null;
    this.musicService.songs = null;
    this.musicService.playlists = null;

    const results = await this.musicService.musicKit.api.search(term, { types: 'artists,albums,songs,playlists', limit: 20 });

    if (results.artists != null) {
      this.musicService.artists = results.artists.data;
    }

    if (results.albums != null) {
      this.musicService.albums = results.albums.data;
    }

    if (results.songs != null) {
      this.musicService.songs = results.songs.data;
    }

    if (results.playlists != null) {
      this.musicService.playlists = results.playlists.data;
    }

    this.musicService.lastSearchTerm = term;
  }

  async getSearchHints(term: string) {
    if (term !== '') {
      this.searchHints = await this.musicService.musicKit.api.searchHints(term);
    }
  }

  async getItemRelationships(collection: any, type: string) {
    let itemIdArray: any;
    let results: any;

    switch (type) {
      case 'albums': {
        const albums = collection.filter(i => i.type === 'albums');
        itemIdArray = albums.map(i => i.id);
        results = await this.musicService.musicKit.api.albums(itemIdArray, { include: 'artists' });

        for (const item of collection) {
          for (const result of results) {
            if (item.id === result.id) {
              item.relationships = result.relationships;
              break;
            }
          }
        }

        break;
      }
      case 'playlists': {
        itemIdArray = collection.map(i => i.id);
        results = await this.musicService.musicKit.api.playlists(itemIdArray, { include: 'curators' });

        for (const item of collection) {
          let index = 0;

          for (const result of results) {
            if (item.id === result.id && result.relationships.curator.data.length) {
              collection[index].relationships = result.relationships;
              break;
            }

            index++;
          }
        }

        break;
      }
      case 'songs': {
        itemIdArray = collection.map(i => i.id);
        results = await this.musicService.musicKit.api.songs(itemIdArray, { include: 'artists,albums' });

        for (const item of collection) {
          for (const result of results) {
            if (item.id === result.id) {
              item.relationships = result.relationships;
              break;
            }
          }
        }

        break;
      }
    }
  }

  async getArtwork(artist: any) {
    if (!artist.attributes.artworkUrl) {
      artist.attributes.artworkUrl = await this.musicService.getArtistArtwork(artist.attributes.url);
    }
  }

}