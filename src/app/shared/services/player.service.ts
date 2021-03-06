import { Injectable } from '@angular/core';
import { Tokens } from '../../tokens';

declare var MusicKit: any;

@Injectable({
  providedIn: 'root'
})
export class PlayerService {

  musicKit: any;
  authorized = false;
  playing = false;
  nowPlayingItem: any;
  nowPlayingPlaylist: any;
  playbackLoading: boolean;
  loadingTimeout: any;
  hasPlaybackTimedOut: boolean;
  playbackTimeout: any;

  nowPlayingItemGenius: any;
  nowPlayingItemLyrics: any;

  artist: any;
  albums: any;
  album: any;
  playlists: any;
  playlist: any;
  queue: Array<any>;
  history: Array<any> = [];

  lastSearchTerm = '';
  searchArtists: any;
  searchAlbums: any;
  searchSongs: any;
  searchPlaylists: any;

  recommendations: any;
  recentPlayed: any;
  heavyRotation: any;
  recommendationsDate: number;

  mostPlayed: any;
  top100: any;
  featuredPlaylists: any;
  aListPlaylists: any;
  appleCurators: any;
  curators: any;

  device: any;

  constructor() {
    MusicKit.configure({
      developerToken: Tokens.appleMusicDevToken,
      app: {
        name: 'Apple Music Web Player',
        build: '0.1'
      }
    });

    this.musicKit = MusicKit.getInstance();
    this.authorized = this.musicKit.isAuthorized;
    this.musicKit.player.repeatMode = 2;

    const bitrate = localStorage.getItem('bitrate');
    if (bitrate === null) {
      this.setBitrate(256);
    } else {
      this.setBitrate(+bitrate);
    }

    const volume = localStorage.getItem('volume');
    if (volume === null) {
      this.setVolume(1);
    } else {
      this.setVolume(+volume);
    }

    this.musicKit.addEventListener(MusicKit.Events.mediaItemDidChange, this.mediaItemDidChange.bind(this));
    this.musicKit.addEventListener(MusicKit.Events.playbackStateDidChange, this.playbackStateDidChange.bind(this));
    this.musicKit.addEventListener(MusicKit.Events.authorizationStatusDidChange, this.authorizationStatusDidChange.bind(this));
    this.musicKit.addEventListener(MusicKit.Events.queueItemsDidChange, this.queueItemsDidChange.bind(this));
    this.musicKit.addEventListener(MusicKit.Events.queuePositionDidChange, this.queuePositionDidChange.bind(this));
    this.musicKit.addEventListener(MusicKit.Events.mediaPlaybackError, this.mediaPlaybackError.bind(this));

    this.initializeMediaDevices();
  }

  async playItem(item: any, startIndex: number = 0, shuffle: boolean = false): Promise<any> {
    if (this.playbackLoading) {
      return;
    }

    const playParams = item.attributes.playParams;
    this.musicKit.player.shuffleMode = 0;

    if (!this.playing && this.musicKit.player.nowPlayingItem && item.relationships.tracks.data[startIndex]) {
      if (item.relationships.tracks.data[startIndex].id === this.musicKit.player.nowPlayingItem.id) {
        this.play();
        return;
      }
    }

    await this.musicKit.setQueue({
      [playParams.kind]: playParams.id
    });

    if (startIndex !== 0) {
      await this.musicKit.changeToMediaAtIndex(startIndex);
    }

    if (shuffle) {
      this.musicKit.player.shuffleMode = 1;
    }

    if (item.type.includes('playlists')) {
      this.nowPlayingPlaylist = item;
    } else {
      this.nowPlayingPlaylist = null;
    }

    this.play();
  }

  queueNext (item: any) {
    this.musicKit.player.queue.prepend(item);
  }

  queueLater (item: any) {
    this.musicKit.player.queue.append(item);
  }

  async play(): Promise<any> {
    if (this.playbackLoading) {
      return;
    }

    if (this.hasPlaybackTimedOut) {
      await this.musicKit.player.play();
      await this.musicKit.player.stop();
    }

    await this.musicKit.player.play();
  }

  async pause(): Promise<any> {
    if (this.playbackLoading) {
      return;
    }

    await this.musicKit.player.pause();
  }

  async playNext(): Promise<any> {
    await this.musicKit.player.skipToNextItem();
  }

  async playPrevious(): Promise<any> {
    if (this.musicKit.player.currentPlaybackTime < 11) {
      await this.musicKit.player.skipToPreviousItem();
    } else {
      await this.musicKit.player.seekToTime(0);
    }
  }

  async stop(): Promise<any> {
    await this.musicKit.player.stop();
  }

  async seekToTime(time: number) {
    await this.musicKit.player.seekToTime(time);
  }

  toggleShuffle() {
    if (this.musicKit.player.shuffleMode === 0) {
      this.musicKit.player.shuffleMode = 1;
    } else {
      this.musicKit.player.shuffleMode = 0;
    }
  }

  toggleRepeat() {
    if (this.musicKit.player.repeatMode === 0) {
      this.musicKit.player.repeatMode = 2;
    } else {
      this.musicKit.player.repeatMode = 0;
    }
  }

  async signin(): Promise<any> {
    await this.musicKit.authorize();
  }

  async signout(): Promise<any> {
    await this.musicKit.unauthorize();
  }

  setVolume(volume: number) {
    this.musicKit.player.volume = volume;
    localStorage.setItem('volume', volume.toString());
  }

  setBitrate(bitrate: number) {
    this.musicKit.bitrate = bitrate;
    localStorage.setItem('bitrate', bitrate.toString());
  }

  formatArtwork(artwork: any, size: number): string {
    if (typeof artwork === 'string' || artwork instanceof String) {
      artwork = this.generateArtwork(String(artwork));
    }

    return MusicKit.formatArtworkURL(artwork, size, size);
  }

  generateArtwork(url: string) {
    const artwork = {
      url: url,
      bgColor: '000000',
      height: 1000,
      width: 1000,
      textColor1: '000000',
      textColor2: '000000',
      textColor3: '000000',
      textColor4: '000000'
    };

    return artwork;
  }

  isItemCurrentlyPlaying(id: number): boolean {
    if (this.musicKit.player.nowPlayingItem === null) {
      return false;
    }

    if (id === this.musicKit.player.nowPlayingItem.id && this.playing) {
      return true;
    }

    return false;
  }

  isItemCurrentlyPaused(id: number): boolean {
    if (this.musicKit.player.nowPlayingItem === null) {
      return false;
    }

    if (id === this.musicKit.player.nowPlayingItem.id && !this.playing) {
      return true;
    }

    return false;
  }

  updateQueue() {
    this.queue = [];

    for (const item of this.musicKit.player.queue.items) {
      if (this.musicKit.player.queue.items.indexOf(item) > this.musicKit.player.queue.position) {
        this.queue.push(item);
      }
    }
  }

  mediaItemDidChange(event: any) {
    if (this.nowPlayingItem) {
      if (!this.history.length || this.nowPlayingItem.id !== this.history[this.history.length - 1].songId) {
        if (this.history.length === 30) {
          this.history.shift();
        }

        this.history.push(this.nowPlayingItem);
      }
    }

    this.nowPlayingItem = event.item;

    if (localStorage.getItem('enablePlayPause')) {
      this.hasPlaybackTimedOut = false;
      window.clearTimeout(this.playbackTimeout);

      this.playbackTimeout = window.setTimeout(() => {
        this.hasPlaybackTimedOut = true;
      }, 898000);
    }
  }

  playbackStateDidChange(event: any) {
    this.playing = event.state === 2;
    this.playbackLoading = event.state === 1 || event.state === 8;

    window.clearTimeout(this.loadingTimeout);

    if (this.playbackLoading && localStorage.getItem('enablePlaybackRecovery')) {
      const currentPlaybackTime = this.musicKit.player.currentPlaybackTime;

      this.loadingTimeout = window.setTimeout(async function() {
        const musicKit = MusicKit.getInstance();

        if (currentPlaybackTime <= 10) {
          await musicKit.player.stop();
          await musicKit.player.play();
        }
      }, (+localStorage.getItem('playbackTimeout') || 8000));
    }
  }

  authorizationStatusDidChange(event: any) {
    this.authorized = event.authorizationStatus;
  }

  queueItemsDidChange(event: any) {
    if (this.musicKit.player.queue.position < 0) {
      return;
    }

    this.updateQueue();
  }

  queuePositionDidChange(event: any) {
    this.updateQueue();
  }

  mediaPlaybackError(event: any) {
    if (event.errorCode === 'DEVICE_LIMIT' || event.errorCode === 'STREAM_UPSELL') {
      this.stop();
    }
  }

  initializeMediaDevices() {
    this.device = JSON.parse(localStorage.getItem('device'));

    navigator.mediaDevices.addEventListener('devicechange', () => {
      if (Boolean(JSON.parse(localStorage.getItem('enablePlayPause')))) {
        navigator.mediaDevices.enumerateDevices().then(audioDevices => {
          let foundDevice = false;

          if (this.device && this.device.id.length > 0) {
            for (const audioDevice of audioDevices) {
              if (audioDevice.deviceId === this.device.id) {
                foundDevice = true;

                if (this.musicKit.player.nowPlayingItem && !this.playing) {
                  this.play();
                  return;
                }
              }
            }

            if (this.playing && !foundDevice) {
              this.pause();
            }
          }
        });
      }
    });
  }

}
