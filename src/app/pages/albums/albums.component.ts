import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PlayerService } from '../../shared/services/player.service';
import { ApiService } from '../../shared/services/api.service';
import * as $ from 'jquery';

@Component({
  selector: 'app-albums',
  templateUrl: './albums.component.html',
  styleUrls: ['./albums.component.css']
})
export class AlbumsComponent implements OnInit, OnDestroy {

  albumSubscription: Subscription;
  loading: boolean;
  albumDuration: number;
  artistAlbums: any;
  relatedAlbums: any;
  albumData: any;
  ratings: any;
  popularity: any;

  constructor(private route: ActivatedRoute, private router: Router,
    public playerService: PlayerService, public apiService: ApiService) { }

  ngOnInit() {
    this.albumSubscription = this.route.params.subscribe(params => {
      this.loadAlbum(params['id']);
    });

    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };

    $(window).on('resize', function() {
      this.setEditorialNotesStyle();
    }.bind(this));
  }

  ngOnDestroy(): void {
    this.albumSubscription.unsubscribe();
  }

  async loadAlbum(id: string) {
    this.loading = true;

    this.playerService.album = await this.apiService.getAlbum(id, this.playerService.album);
    this.setEditorialNotesStyle();

    this.loading = false;

    this.artistAlbums = null;
    this.getArtistAlbums();

    this.relatedAlbums = null;
    this.getAlbumInfo();

    if (this.playerService.authorized) {
      this.getRatings();
    }

    if (this.playerService.album.attributes.artistName === 'Various Artists') {
      this.apiService.getRelationships(this.playerService.album.relationships.tracks.data, 'songs');
    }

    this.albumDuration = 0;

    for (const item of this.playerService.album.relationships.tracks.data) {
      this.albumDuration += item.attributes.durationInMillis;
    }
  }

  async getArtistAlbums() {
    if (this.playerService.album.relationships.artists && this.playerService.album.relationships.artists.data.length) {
      this.artistAlbums = await this.playerService.musicKit.api.artist(this.playerService.album.relationships.artists.data[0].id);
      const itemIdArray = this.artistAlbums.relationships.albums.data.map(i => i.id);
      this.artistAlbums.relationships.albums.data = await this.playerService.musicKit.api.albums(itemIdArray);
    }
  }

  async getAlbumInfo() {
    if (!this.playerService.album.attributes.url) {
      return;
    }

    const resp = await this.apiService.getAlbumData(Array.of(this.playerService.album.id));
    this.albumData = resp.albums[0];

    if (!this.albumData.resources.data.relationships.listenersAlsoBought.data) {
      return;
    }

    const relatedAlbumsIds = this.albumData.resources.data.relationships.listenersAlsoBought.data.map(i => i.id);
    this.relatedAlbums = await this.playerService.musicKit.api.albums(relatedAlbumsIds);

    this.getPopulatity();
  }

  async getRatings() {
    this.ratings = await this.apiService.getRatings(this.playerService.album);
  }

  async getPopulatity() {
    this.popularity = [];

    for (const item of this.albumData.resources.included) {
      if (item.type === 'product/album/song') {
        if (item.attributes.popularity >= 0.7) {
          this.popularity.push(item.id);
        }
      }
    }
  }

  setEditorialNotesStyle() {
    if (!this.playerService.album.attributes.editorialNotes) {
      return;
    }

    $(document).ready(function() {
      if ($('#notes')) {
        const height = $(window).height();
        const notesOffset = $('#notes').offset().top;
        const notesParentOffset = $('#notes').parent().offset().top;
        $('#notes').css('max-height', height  - notesOffset + notesParentOffset - 160);
      }
    });
  }

}
