// VTuber WebAR Experience - ���C���X�N���v�g

// �O���[�o���ϐ�
const config = {
  // Google�h���C�u���惊���N (������Əc����̗������T�|�[�g)
  horizontalVideoId: '1kA5sJEVSORl7NNWTZiMay1Fi6v3T8fPg', // ������
  verticalVideoId: '17-I-jcKJdzqZVLtglzIRJIravPwee-Jh', // �c����
  // �ǂ�����g�p���邩 (true: �c����Afalse: ������)
  useVerticalVideo: false, // �f�t�H���g�͉�����
  // ����̕\���T�C�Y (AR�}�[�J�[�ɑ΂��鑊�΃T�C�Y)
  videoWidth: 1.6,  // ������̕�
  videoHeight: 0.9, // ������̍���
  verticalVideoWidth: 0.9,  // �c����̕�
  verticalVideoHeight: 1.6, // �c����̍���
  // �}�[�J�[���o
  detectionTimeout: 10000, // �}�[�J�[���o�̃^�C���A�E�g (�~���b)
  // ���C�u���̕\��
  liveInfoDelay: 30000, // ����Đ��J�n���牽�~���b��Ƀ��C�u����\�����邩
  // ���C�u���
  liveDate: '9��XX��',
  liveVenue: '��ꖢ��',
  liveLink: 'https://riotmusic.com',
  // �G���[���g���C��
  maxRetries: 3,
};

// �X�e�[�g�Ǘ�
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

// DOM�v�f
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

// ���[�e�B���e�B�֐�
const getGoogleDriveDirectLink = (fileId) => {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
};

const logEvent = (eventName, data = {}) => {
  console.log(`[WebAR] ${eventName}`, data);
  // �����ɃA�N�Z�X��̓C�x���g�̑��M�R�[�h��ǉ�
};

// �������֐�
const init = () => {
  // DOM�v�f�̎擾
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

  // �N���[�Y�{�^���̎擾
  closeButtons = document.querySelectorAll('.close-button');
  
  // AR�T�|�[�g�`�F�b�N
  checkARSupport();
  
  // �C�x���g���X�i�[�̐ݒ�
  setupEventListeners();
  
  // ����URL�̐ݒ�
  setupVideoSources();
  
  // ���[�f�B���O��ʂ��\���ɂ��Ďw����ʂ�\��
  setTimeout(() => {
    loadingScreen.style.display = 'none';
    instructionScreen.style.display = 'flex';
  }, 1500);
  
  logEvent('init_complete');
};

// AR�T�|�[�g�`�F�b�N
const checkARSupport = () => {
  // �J�����̃T�|�[�g�`�F�b�N
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    state.isARSupported = false;
    logEvent('ar_not_supported', { reason: 'camera_api_missing' });
    return;
  }
  
  // WebGL�̃T�|�[�g�`�F�b�N
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    state.isARSupported = false;
    logEvent('ar_not_supported', { reason: 'webgl_not_supported' });
    return;
  }
  
  logEvent('ar_supported');
};

// �C�x���g���X�i�[�̐ݒ�
const setupEventListeners = () => {
  // �X�^�[�g�{�^��
  startButton.addEventListener('click', startAR);
  
  // ���g���C�{�^��
  retryButton.addEventListener('click', () => {
    errorScreen.style.display = 'none';
    startAR();
  });
  
  // �}�[�J�[���o�C�x���g
  markerElement.addEventListener('markerFound', onMarkerFound);
  markerElement.addEventListener('markerLost', onMarkerLost);
  
  // �N���[�Y�{�^��
  closeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const parent = e.target.closest('.live-info');
      if (parent) {
        parent.parentElement.style.display = 'none';
      }
    });
  });
  
  // �t�H�[���o�b�N����̃C�x���g
  fallbackVideo.addEventListener('ended', () => {
    fallbackVideo.currentTime = 0;
    fallbackVideo.play();
    
    // ���[�v�Đ�����ш�莞�Ԍ�Ƀ��C�u���\��
    if (!state.liveInfoShown) {
      setTimeout(() => {
        fallbackLiveInfo.style.display = 'block';
        state.liveInfoShown = true;
        logEvent('fallback_live_info_shown');
      }, config.liveInfoDelay);
    }
  });
  
  // �E�B���h�E�T�C�Y�ύX���̏���
  window.addEventListener('resize', onWindowResize);
};

// ����URL�̐ݒ�
const setupVideoSources = () => {
  // �������URL��ݒ�
  const horizontalVideoUrl = getGoogleDriveDirectLink(config.horizontalVideoId);
  videoElement.setAttribute('src', horizontalVideoUrl);
  
  // �c�����URL��ݒ�
  const verticalVideoUrl = getGoogleDriveDirectLink(config.verticalVideoId);
  verticalVideoElement.setAttribute('src', verticalVideoUrl);
  
  // �t�H�[���o�b�N�����URL��ݒ�
  fallbackVideo.src = config.useVerticalVideo ? verticalVideoUrl : horizontalVideoUrl;
  
  logEvent('video_sources_set');
};

// AR�J�n
const startAR = () => {
  logEvent('ar_start_attempt');
  
  // �w����ʂ��\��
  instructionScreen.style.display = 'none';
  
  // AR���T�|�[�g����Ă��Ȃ��ꍇ�̓t�H�[���o�b�N
  if (!state.isARSupported) {
    showFallback();
    return;
  }
  
  // AR�����p�\�ȏꍇ
  try {
    // AR�V�[����\��
    arScene.style.display = 'block';
    
    // �J�����A�N�Z�X����v��
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        logEvent('camera_access_granted');
        
        // �}�[�J�[���o�^�C���A�E�g�̐ݒ�
        state.markerDetectionTimer = setTimeout(() => {
          if (!state.isMarkerDetected) {
            showError('�}�[�J�[�����o�ł��܂���B�}�[�J�[��������悤�ɃJ�����𒲐����Ă��������B');
          }
        }, config.detectionTimeout);
      })
      .catch(err => {
        logEvent('camera_access_denied', { error: err.message });
        showError('�J�����ւ̃A�N�Z�X�����ۂ���܂����B�ݒ肩��J�����ւ̃A�N�Z�X�������Ă��������B');
      });
  } catch (error) {
    logEvent('ar_start_error', { error: error.message });
    showError('AR�̊J�n���ɃG���[���������܂����B������x���������������B');
  }
};

// �}�[�J�[���o��
const onMarkerFound = () => {
  logEvent('marker_found');
  state.isMarkerDetected = true;
  
  // �}�[�J�[���o�^�C���A�E�g���N���A
  if (state.markerDetectionTimer) {
    clearTimeout(state.markerDetectionTimer);
  }
  
  // �g�p���铮��v�f��I��
  const activeVideoElement = config.useVerticalVideo ? verticalVideoElement : videoElement;
  
  // ����v�f��\��
  activeVideoElement.setAttribute('visible', 'true');
  
  // ���悪�����[�h�̏ꍇ�̓��[�h
  if (!state.isVideoLoaded) {
    loadVideo(activeVideoElement);
  }
  // ���Ƀ��[�h�ς݂̏ꍇ�͍Đ�
  else if (!state.isVideoPlaying) {
    playVideo(activeVideoElement);
  }
};

// �}�[�J�[���X�g��
const onMarkerLost = () => {
  logEvent('marker_lost');
  state.isMarkerDetected = false;
  
  // �g�p���铮��v�f��I��
  const activeVideoElement = config.useVerticalVideo ? verticalVideoElement : videoElement;
  
  // �ꎞ��~�͂��Ȃ��i�}�[�J�[���Č��o���ꂽ�Ƃ��ɃV�[�����X�ɍĊJ�ł���悤�Ɂj
  // ����ɁA�����ԃ}�[�J�[�����X�g�����ꍇ�̃n���h�����O���K�v�Ȃ炱���ɒǉ�
};

// ����̃��[�h�ƍĐ�
const loadVideo = (videoElement) => {
  logEvent('video_load_attempt');
  
  // ����̃��[�h�G���[�n���h�����O
  const onVideoError = () => {
    logEvent('video_load_error', { retryCount: state.retryCount });
    
    if (state.retryCount < config.maxRetries) {
      state.retryCount++;
      setTimeout(() => loadVideo(videoElement), 1000);
    } else {
      showError('����̓ǂݍ��݂Ɏ��s���܂����B�l�b�g���[�N�ڑ����m�F���Ă��������B');
    }
  };
  
  // ����̃��[�h������
  const onVideoLoaded = () => {
    logEvent('video_loaded');
    state.isVideoLoaded = true;
    playVideo(videoElement);
  };
  
  // �C�x���g���X�i�[�̒ǉ�
  const videoAsset = videoElement.components.material.material.map.image;
  videoAsset.addEventListener('error', onVideoError);
  videoAsset.addEventListener('loadeddata', onVideoLoaded);
  
  // ����̃��[�h
  try {
    videoAsset.load();
  } catch (error) {
    onVideoError();
  }
};

// ����̍Đ�
const playVideo = (videoElement) => {
  logEvent('video_play_attempt');
  
  const videoAsset = videoElement.components.material.material.map.image;
  
  // ����̍Đ�
  videoAsset.play()
    .then(() => {
      logEvent('video_playing');
      state.isVideoPlaying = true;
      
      // ���[�v�Đ��̐ݒ�
      videoAsset.loop = true;
      
      // ��莞�Ԍ�Ƀ��C�u����\��
      if (!state.liveInfoShown) {
        state.liveInfoTimer = setTimeout(() => {
          showLiveInfo();
        }, config.liveInfoDelay);
      }
    })
    .catch(error => {
      logEvent('video_play_error', { error: error.message });
      
      // �����Đ��|���V�[�Ɉ������������\��������
      showError('����̍Đ��Ɏ��s���܂����B��ʂ��^�b�v���čĐ������݂Ă��������B');
    });
};

// ���C�u���̕\��
const showLiveInfo = () => {
  logEvent('live_info_shown');
  state.liveInfoShown = true;
  
  // ���C�u���I�[�o�[���C��\��
  liveInfoOverlay.style.display = 'flex';
  
  // ���C�u���̃e�L�X�g���X�V
  const liveInfoElements = document.querySelectorAll('.live-info h3');
  liveInfoElements.forEach(element => {
    element.textContent = `���C�u�J�ÁI${config.liveDate}@${config.liveVenue}`;
  });
  
  // ���C�u���̃����N���X�V
  const liveLinkElements = document.querySelectorAll('.live-link');
  liveLinkElements.forEach(element => {
    element.href = config.liveLink;
  });
};

// �G���[��ʂ̕\��
const showError = (message) => {
  logEvent('error_shown', { message });
  
  // AR�V�[�����\��
  arScene.style.display = 'none';
  
  // �G���[���b�Z�[�W��ݒ�
  errorMessage.textContent = message;
  
  // �G���[��ʂ�\��
  errorScreen.style.display = 'flex';
};

// �t�H�[���o�b�N��ʂ̕\���iAR��Ή����j
const showFallback = () => {
  logEvent('fallback_shown');
  
  // �t�H�[���o�b�N��ʂ�\��
  fallbackScreen.style.display = 'flex';
  
  // ����̍Đ�
  fallbackVideo.play()
    .then(() => {
      logEvent('fallback_video_playing');
      
      // ��莞�Ԍ�Ƀ��C�u���\��
      setTimeout(() => {
        fallbackLiveInfo.style.display = 'block';
        state.liveInfoShown = true;
        logEvent('fallback_live_info_shown');
      }, config.liveInfoDelay);
    })
    .catch(error => {
      logEvent('fallback_video_play_error', { error: error.message });
      showError('����̍Đ��Ɏ��s���܂����B��ʂ��^�b�v���čĐ������݂Ă��������B');
    });
};

// �E�B���h�E�T�C�Y�ύX���̏���
const onWindowResize = () => {
  // �K�v�ɉ�����UI�v�f�̃T�C�Y�����Ȃ�
};

// �A�v���P�[�V����������
document.addEventListener('DOMContentLoaded', init);

// �T�[�r�X���[�J�[�o�^�iPWA�T�|�[�g�j
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