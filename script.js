// VTuber WebAR Experience - メインスクリプト

// グローバル変数
const config = {
  // Googleドライブ動画リンク (横動画と縦動画の両方をサポート)
  horizontalVideoId: '1kA5sJEVSORl7NNWTZiMay1Fi6v3T8fPg', // 横動画
  verticalVideoId: '17-I-jcKJdzqZVLtglzIRJIravPwee-Jh', // 縦動画
  // どちらを使用するか (true: 縦動画、false: 横動画)
  useVerticalVideo: false, // デフォルトは横動画
  // 動画の表示サイズ (ARマーカーに対する相対サイズ)
  videoWidth: 1.6,  // 横動画の幅
  videoHeight: 0.9, // 横動画の高さ
  verticalVideoWidth: 0.9,  // 縦動画の幅
  verticalVideoHeight: 1.6, // 縦動画の高さ
  // マーカー検出
  detectionTimeout: 10000, // マーカー検出のタイムアウト (ミリ秒)
  // ライブ情報の表示
  liveInfoDelay: 30000, // 動画再生開始から何ミリ秒後にライブ情報を表示するか
  // ライブ情報
  liveDate: '9月XX日',
  liveVenue: '会場未定',
  liveLink: 'https://riotmusic.com',
  // エラーリトライ回数
  maxRetries: 3,
};

// ステート管理
const state = {
  isARSupported: true,
  isMarkerDetected: false,
  isVideoLoaded: false,
  isVideoPlaying: false,
  liveInfoShown: false,
  retryCount: 0,
  liveInfoTimer: null,
  markerDetectionTimer: null,
};

// DOM要素
let loadingScreen;
let instructionScreen;
let fallbackScreen;
let errorScreen;
let startButton;
let retryButton;
let arScene;
let markerElement;
let videoElement;
let verticalVideoElement;
let liveInfoOverlay;
let fallbackVideo;
let fallbackLiveInfo;
let errorMessage;
let closeButtons;

// ユーティリティ関数
const getGoogleDriveDirectLink = (fileId) => {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
};

const logEvent = (eventName, data = {}) => {
  console.log(`[WebAR] ${eventName}`, data);
  // ここにアクセス解析イベントの送信コードを追加
};

// 初期化関数
const init = () => {
  // DOM要素の取得
  loadingScreen = document.getElementById('loading-screen');
  instructionScreen = document.getElementById('instruction-screen');
  fallbackScreen = document.getElementById('fallback-screen');
  errorScreen = document.getElementById('error-screen');
  startButton = document.getElementById('start-button');
  retryButton = document.getElementById('retry-button');
  arScene = document.getElementById('ar-scene');
  markerElement = document.getElementById('hiro-marker');
  videoElement = document.getElementById('mv-video');
  verticalVideoElement = document.getElementById('mv-video-vertical');
  liveInfoOverlay = document.getElementById('live-info-overlay');
  fallbackVideo = document.getElementById('fallback-video');
  fallbackLiveInfo = document.getElementById('fallback-live-info');
  errorMessage = document.getElementById('error-message');

  // クローズボタンの取得
  closeButtons = document.querySelectorAll('.close-button');
  
  // ARサポートチェック
  checkARSupport();
  
  // イベントリスナーの設定
  setupEventListeners();
  
  // 動画URLの設定
  setupVideoSources();
  
  // ローディング画面を非表示にして指示画面を表示
  setTimeout(() => {
    loadingScreen.style.display = 'none';
    instructionScreen.style.display = 'flex';
  }, 1500);
  
  logEvent('init_complete');
};

// ARサポートチェック
const checkARSupport = () => {
  // カメラのサポートチェック
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    state.isARSupported = false;
    logEvent('ar_not_supported', { reason: 'camera_api_missing' });
    return;
  }
  
  // WebGLのサポートチェック
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    state.isARSupported = false;
    logEvent('ar_not_supported', { reason: 'webgl_not_supported' });
    return;
  }
  
  logEvent('ar_supported');
};

// イベントリスナーの設定
const setupEventListeners = () => {
  // スタートボタン
  startButton.addEventListener('click', startAR);
  
  // リトライボタン
  retryButton.addEventListener('click', () => {
    errorScreen.style.display = 'none';
    startAR();
  });
  
  // マーカー検出イベント
  markerElement.addEventListener('markerFound', onMarkerFound);
  markerElement.addEventListener('markerLost', onMarkerLost);
  
  // クローズボタン
  closeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const parent = e.target.closest('.live-info');
      if (parent) {
        parent.parentElement.style.display = 'none';
      }
    });
  });
  
  // フォールバック動画のイベント
  fallbackVideo.addEventListener('ended', () => {
    fallbackVideo.currentTime = 0;
    fallbackVideo.play();
    
    // ループ再生および一定時間後にライブ情報表示
    if (!state.liveInfoShown) {
      setTimeout(() => {
        fallbackLiveInfo.style.display = 'block';
        state.liveInfoShown = true;
        logEvent('fallback_live_info_shown');
      }, config.liveInfoDelay);
    }
  });
  
  // ウィンドウサイズ変更時の処理
  window.addEventListener('resize', onWindowResize);
};

// 動画URLの設定
const setupVideoSources = () => {
  // 横動画のURLを設定
  const horizontalVideoUrl = getGoogleDriveDirectLink(config.horizontalVideoId);
  videoElement.setAttribute('src', horizontalVideoUrl);
  
  // 縦動画のURLを設定
  const verticalVideoUrl = getGoogleDriveDirectLink(config.verticalVideoId);
  verticalVideoElement.setAttribute('src', verticalVideoUrl);
  
  // フォールバック動画のURLを設定
  fallbackVideo.src = config.useVerticalVideo ? verticalVideoUrl : horizontalVideoUrl;
  
  logEvent('video_sources_set');
};

// AR開始
const startAR = () => {
  logEvent('ar_start_attempt');
  
  // 指示画面を非表示
  instructionScreen.style.display = 'none';
  
  // ARがサポートされていない場合はフォールバック
  if (!state.isARSupported) {
    showFallback();
    return;
  }
  
  // ARが利用可能な場合
  try {
    // ARシーンを表示
    arScene.style.display = 'block';
    
    // カメラアクセス許可を要求
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        logEvent('camera_access_granted');
        
        // マーカー検出タイムアウトの設定
        state.markerDetectionTimer = setTimeout(() => {
          if (!state.isMarkerDetected) {
            showError('マーカーが検出できません。マーカーが見えるようにカメラを調整してください。');
          }
        }, config.detectionTimeout);
      })
      .catch(err => {
        logEvent('camera_access_denied', { error: err.message });
        showError('カメラへのアクセスが拒否されました。設定からカメラへのアクセスを許可してください。');
      });
  } catch (error) {
    logEvent('ar_start_error', { error: error.message });
    showError('ARの開始中にエラーが発生しました。もう一度お試しください。');
  }
};

// マーカー検出時
const onMarkerFound = () => {
  logEvent('marker_found');
  state.isMarkerDetected = true;
  
  // マーカー検出タイムアウトをクリア
  if (state.markerDetectionTimer) {
    clearTimeout(state.markerDetectionTimer);
  }
  
  // 使用する動画要素を選択
  const activeVideoElement = config.useVerticalVideo ? verticalVideoElement : videoElement;
  
  // 動画要素を表示
  activeVideoElement.setAttribute('visible', 'true');
  
  // 動画が未ロードの場合はロード
  if (!state.isVideoLoaded) {
    loadVideo(activeVideoElement);
  }
  // 既にロード済みの場合は再生
  else if (!state.isVideoPlaying) {
    playVideo(activeVideoElement);
  }
};

// マーカーロスト時
const onMarkerLost = () => {
  logEvent('marker_lost');
  state.isMarkerDetected = false;
  
  // 使用する動画要素を選択
  const activeVideoElement = config.useVerticalVideo ? verticalVideoElement : videoElement;
  
  // 一時停止はしない（マーカーが再検出されたときにシームレスに再開できるように）
  // 代わりに、長時間マーカーがロストした場合のハンドリングが必要ならここに追加
};

// 動画のロードと再生
const loadVideo = (videoElement) => {
  logEvent('video_load_attempt');
  
  // 動画のロードエラーハンドリング
  const onVideoError = () => {
    logEvent('video_load_error', { retryCount: state.retryCount });
    
    if (state.retryCount < config.maxRetries) {
      state.retryCount++;
      setTimeout(() => loadVideo(videoElement), 1000);
    } else {
      showError('動画の読み込みに失敗しました。ネットワーク接続を確認してください。');
    }
  };
  
  // 動画のロード成功時
  const onVideoLoaded = () => {
    logEvent('video_loaded');
    state.isVideoLoaded = true;
    playVideo(videoElement);
  };
  
  // イベントリスナーの追加
  const videoAsset = videoElement.components.material.material.map.image;
  videoAsset.addEventListener('error', onVideoError);
  videoAsset.addEventListener('loadeddata', onVideoLoaded);
  
  // 動画のロード
  try {
    videoAsset.load();
  } catch (error) {
    onVideoError();
  }
};

// 動画の再生
const playVideo = (videoElement) => {
  logEvent('video_play_attempt');
  
  const videoAsset = videoElement.components.material.material.map.image;
  
  // 動画の再生
  videoAsset.play()
    .then(() => {
      logEvent('video_playing');
      state.isVideoPlaying = true;
      
      // ループ再生の設定
      videoAsset.loop = true;
      
      // 一定時間後にライブ情報を表示
      if (!state.liveInfoShown) {
        state.liveInfoTimer = setTimeout(() => {
          showLiveInfo();
        }, config.liveInfoDelay);
      }
    })
    .catch(error => {
      logEvent('video_play_error', { error: error.message });
      
      // 自動再生ポリシーに引っかかった可能性がある
      showError('動画の再生に失敗しました。画面をタップして再生を試みてください。');
    });
};

// ライブ情報の表示
const showLiveInfo = () => {
  logEvent('live_info_shown');
  state.liveInfoShown = true;
  
  // ライブ情報オーバーレイを表示
  liveInfoOverlay.style.display = 'flex';
  
  // ライブ情報のテキストを更新
  const liveInfoElements = document.querySelectorAll('.live-info h3');
  liveInfoElements.forEach(element => {
    element.textContent = `ライブ開催！${config.liveDate}@${config.liveVenue}`;
  });
  
  // ライブ情報のリンクを更新
  const liveLinkElements = document.querySelectorAll('.live-link');
  liveLinkElements.forEach(element => {
    element.href = config.liveLink;
  });
};

// エラー画面の表示
const showError = (message) => {
  logEvent('error_shown', { message });
  
  // ARシーンを非表示
  arScene.style.display = 'none';
  
  // エラーメッセージを設定
  errorMessage.textContent = message;
  
  // エラー画面を表示
  errorScreen.style.display = 'flex';
};

// フォールバック画面の表示（AR非対応時）
const showFallback = () => {
  logEvent('fallback_shown');
  
  // フォールバック画面を表示
  fallbackScreen.style.display = 'flex';
  
  // 動画の再生
  fallbackVideo.play()
    .then(() => {
      logEvent('fallback_video_playing');
      
      // 一定時間後にライブ情報表示
      setTimeout(() => {
        fallbackLiveInfo.style.display = 'block';
        state.liveInfoShown = true;
        logEvent('fallback_live_info_shown');
      }, config.liveInfoDelay);
    })
    .catch(error => {
      logEvent('fallback_video_play_error', { error: error.message });
      showError('動画の再生に失敗しました。画面をタップして再生を試みてください。');
    });
};

// ウィンドウサイズ変更時の処理
const onWindowResize = () => {
  // 必要に応じてUI要素のサイズ調整など
};

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', init);

// サービスワーカー登録（PWAサポート）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('ServiceWorker registered:', reg);
      })
      .catch(err => {
        console.error('ServiceWorker registration failed:', err);
      });
  });
}