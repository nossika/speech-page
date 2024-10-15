// 显式展示代码依赖（从 CDN 脚本引入的 window 全局变量）
var { Vue, Vuetify } = window;

const util = {
  request: {
    post: async (url, data) => {
      const response = await window.fetch(url, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'X-Key': util.getURLParams('key'),
        },
        body: JSON.stringify(data),
      });

      if (response.status !== 200) {
        throw new Error(`${url}: ${JSON.stringify(await response.json())}`);
      }

      return response;
    },
    upload: async (url, file) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await window.fetch(url, {
        method: 'post',
        headers: {
          'X-Key': util.getURLParams('key'),
        },
        body: formData,
      });

      if (response.status !== 200) {
        throw new Error(`${url}: ${JSON.stringify(await response.json())}`);
      }

      return response;
    },
  },
  download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  getURLParams(key) {
    const params = new URLSearchParams(location.search);
    return params.get(key) || '';
  },
  setURLParams(key, val) {
    const params = new URLSearchParams(location.search);
    params.set(key, val);
    history.pushState(null, '', `?${params.toString()}`);
  },
  async playAudio(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.addEventListener('error', (error) => {
        reject(error);
        URL.revokeObjectURL(url);
      })
      audio.addEventListener('ended', () => {
        resolve();
        URL.revokeObjectURL(url);
      });
    });
  },
  getSupportedAudioMIMEType() {
    const types = ['webm', 'mp4', 'ogg', 'x-matroska'].map(s => `audio/${s}`);
    return types.filter(type => MediaRecorder.isTypeSupported(type));
  },
  getFileSuffix(blob) {
    return blob.type.split('/').slice(-1)[0] || '';
  },
  async getRecorderStream() {
    const mediaStream = await window.navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = util.getSupportedAudioMIMEType()[0];
    if (!mimeType) {
      throw new Error('No supported audio');
    }

    const recorder = new MediaRecorder(mediaStream, { mimeType });
    const data = [];
    const error = null;

    recorder.start();
    recorder.addEventListener('dataavailable', e => {
      data.push(e.data);
    });
    recorder.addEventListener('error', (err) => {
      error = err;
    });

    const stream = async () => {
      return new Promise((resolve, reject) => {
        if (error) {
          reject(error);
          return;
        }
        recorder.addEventListener('stop', () => {
          const blob = new Blob(data, { type: mimeType });
          resolve(blob);
        });
        recorder.stop();
      });
    };

    return stream;
  },
};

const SpeechApp = {
  setup() {
    // @refer: https://aka.ms/speech/tts-languages
    const voiceOptions = [
      'zh-CN-XiaoyiNeural',
      'en-US-JennyNeural',
      'ja-JP-NanamiNeural',
    ];

    const { ref, computed } = Vue;
    const text = ref('');
    const file = ref(null);
    const voice = ref(voiceOptions[0]);
    const errorText = ref('');
    const errorAudio = ref('');
    const submittingText = ref(false);
    const submittingAudio = ref(false);
    const playing = ref(false);
    const recorderStream = ref(null);
    const isAutoPlay = ref(true);
    const fileInputElem = ref();

    const toSpeech = async () => {
      if (submittingText.value || !text.value) return;
      submittingText.value = true;
      errorText.value = '';

      try {
        const resp = await util.request.post('/text-to-speech', {
          text: text.value,
          voice: voice.value,
        });

        const blob = await resp.blob();

        file.value = new File(
          [blob],
          `${text.value.slice(0, 10)}.mp3`,
          {
            type: blob.type,
          }
        );
      } catch (err) {
        console.error(err);
        errorText.value = String(err);
      } finally {
        submittingText.value = false;
      }

      if (isAutoPlay.value) {
        playAudio();
      }
    };

    const playAudio = () => {
      if (!file.value) return;
      playing.value = true;
      util.playAudio(file.value).finally(() => {
        playing.value = false;
      });
    };

    const startRecording = async () => {
      if (recorderStream.value) return;
      errorAudio.value = '';
      const stream = await util.getRecorderStream().catch(err => {
        error.value = String(err);
      });
      recorderStream.value = stream || null;
      file.value = null;
    };

    const stopRecording = async () => {
      const stream = recorderStream.value;
      if (!stream) return;
      recorderStream.value = null;
      errorAudio.value = '';

      try {
        const blob = await stream();

        file.value = new File(
          [blob],
          `voice_${new Date().toLocaleString()}.${util.getFileSuffix(blob) || 'mp3'}`,
          {
            type: blob.type,
          }
        );
      } catch (err) {
        console.error(err);
        errorAudio.value = String(err);
      }
    };

    const isRecording = computed(() => !!recorderStream.value);

    const downloadAudio = () => {
      const f = file.value;
      if (!f) return;
      util.download(f, f.name);
    };

    const toText = async () => {
      if (submittingAudio.value || !file.value) return;
      errorAudio.value = '';
      submittingAudio.value = true;
      try {
        const resp = await util.request.upload('/speech-to-text', file.value);
        const { data } = await resp.json();
        text.value = data.text;
      } catch (err) {
        console.error(err);
        errorAudio.value = String(err);
      } finally {
        submittingAudio.value = false;
      }
    };

    return {
      text,
      file,
      toSpeech,
      toText,
      playAudio,
      submittingText,
      submittingAudio,
      playing,
      errorText,
      errorAudio,
      downloadAudio,
      startRecording,
      stopRecording,
      isRecording,
      isAutoPlay,
      fileInputElem,
      voice,
      voiceOptions,
    };
  },
  template: `
    <v-card class="pa-4">
      <v-textarea
        label="Speech Text"
        variant="outlined"
        v-model="text"
        :loading="submittingText"
        hide-details="auto"
        @keyup.ctrl.enter="toSpeech"
        placeholder="Use Ctrl + Enter to submit"
      />
      <v-select
        class="mt-4"
        variant="outlined"
        label="Voice"
        v-model="voice"
        :items="voiceOptions"
      />
      <div class="d-flex align-center ga-4 mt-4">
        <v-btn
          @click="toSpeech"
          :loading="submittingText"
          :disabled="!text"
          color="teal-darken-1"
          prepend-icon="mdi-account-voice"
        >
          speak
        </v-btn>
        <v-switch
          v-model="isAutoPlay"
          label="Auto Play"
          color="teal-darken-1"
          hide-details
        />
      </div>
      <v-alert class="mt-4" type="error" :text="errorText" :model-value="!!errorText"/>
    </v-card>
    <v-card class="pa-4 mt-4">
      <v-alert class="mb-4" type="error" :text="errorAudio" :model-value="!!errorAudio"/>
      <div>
        <v-btn
          @click="toText"
          :loading="submittingAudio"
          :disabled="!file"
          color="teal-darken-1"
          prepend-icon="mdi-text-recognition"
        >
          textualize
        </v-btn>
      </div>
      <div class="mt-4">
        <v-file-input
          ref="fileInputElem"
          label="Speech File"
          v-model="file"
          :clearable="false"
          :loading="submittingAudio || isRecording"
          accept="audio/*"
          variant="outlined"
          show-size
          hide-details="auto"
          density="compact"
        />
      </div>
      <div class="d-flex flex-wrap justify-space-between mt-4 ga-4">
        <div class="d-flex flex-wrap ga-4">
          <v-btn
            prepend-icon="mdi-upload"
            @click="fileInputElem.click()"
          >
            upload
          </v-btn>
          <v-btn
            v-if="!isRecording"
            @click="startRecording"
            :disabled="submittingAudio"
            prepend-icon="mdi-record-circle"
          >
            record
          </v-btn>
          <v-btn
            v-if="isRecording"
            @click="stopRecording"
            prepend-icon="mdi-stop"
          >
            stop
          </v-btn>
        </div>
        <div class="d-flex flex-wrap ga-4">
          <v-btn
            @click="downloadAudio"
            :disabled="!file"
            prepend-icon="mdi-download"
          >
            download
          </v-btn>
          <v-btn
            @click="playAudio"
            :loading="playing"
            :disabled="!file"
            prepend-icon="mdi-play"
          >
            play
          </v-btn>
        </div>
      </div>
    </v-card>
  `,
};

const App = {
  setup() {
    const { ref, watchEffect } = Vue;
    const tabs = [
      {
        key: 'speech',
        name: 'speech',
        component: 'SpeechApp',
      },
    ].filter(Boolean);

    const tab = ref(util.getURLParams('tab') || 'speech');

    watchEffect(() => {
      util.setURLParams('tab', tab.value);
    });

    return {
      tabs,
      tab,
    };
  },
  template: `
    <v-container>
      <div class="mb-5 d-flex justify-center">
        <v-btn-toggle
          v-model="tab"
          color="cyan-lighten-4"
          density="compact"
          mandatory="force"
        >
          <v-btn v-for="t in tabs" :value="t.key" :key="t.key">
            {{ t.name }}
          </v-btn>
        </v-btn-toggle>
      </div>
      <div>
        <template v-for="t in tabs">
          <component :is="t.component" v-if="tab === t.key"/>
        </template>
      </div>
    </v-container>
  `,
};


const { createApp } = Vue;
const { createVuetify } = Vuetify;

const vuetify = createVuetify();
const app = createApp(App);

app.component('SpeechApp', SpeechApp);

app.use(vuetify).mount('#app');
