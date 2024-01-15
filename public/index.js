const { ref, computed } = Vue;

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

const ToSpeechApp = {
  setup() {
    const loading = ref(false);
    const text = ref('');
    const submitType = ref('play');
    const error = ref('');
    const playing = ref(false);

    const submit = async () => {
      if (loading.value || !text.value) return;
      loading.value = true;
      error.value = '';

      try {
        const resp = await util.request.post('/text-to-speech', {
          text: text.value,
        });

        const audio = await resp.blob();

        switch (submitType.value) {
          case 'play':
            playing.value = true;
            util.playAudio(audio).finally(() => {
              playing.value = false;
            });
            break;
          case 'download':
            util.download(audio, `${text.value.slice(0, 10)}.mp3`);
            break;
        }
      } catch (err) {
        console.error(err);
        error.value = String(err);
      }

      loading.value = false;
    };

    const setText = (event) => {
      text.value = event.target.value;
    };

    const setSubmitType = (value) => {
      submitType.value = value;
    };

    return {
      text,
      setText,
      submit,
      submitType,
      setSubmitType,
      loading,
      playing,
      error,
    };
  },
  template: `
    <v-card class="pa-4">
      <div>
        <v-textarea
          label="Original Text" variant="outlined" :value="text" @input="setText" :loading="loading" hide-details="auto"
          @keyup.ctrl.enter="submit" placeholder="Use Ctrl + Enter to submit" :prepend-inner-icon="playing ? 'mdi-account-voice' : 'mdi-comment'"
        />
        <div class="d-flex align-center mt-4 flex-wrap" style="gap: 16px;">
          <v-btn
            @click="submit" :loading="loading" :disabled="!text || playing"
            color="teal-darken-1" prepend-icon="mdi-account-voice"
          >
            speak
          </v-btn>
          <v-radio-group inline :model-value="submitType" @update:modelValue="setSubmitType" hide-details>
            <v-radio label="Play" value="play"></v-radio>
            <v-radio label="Download" value="download"></v-radio>
          </v-radio-group>
        </div>
        <v-alert class="mt-4" type="error" :text="error" :model-value="!!error"/>
      </div>
    </v-card>
  `,
};

const ToTextApp = {
  setup() {
    const submitting = ref(false);
    const playing = ref(false);
    const recorderStream = ref(null);
    const text = ref('');
    const error = ref('');
    const files = ref([]);

    const file = computed(() => {
      return files?.value?.[0] || null;
    });

    const startRecording = async () => {
      if (recorderStream.value) return;
      error.value = '';
      const stream = await util.getRecorderStream().catch(err => {
        error.value = String(err);
      });
      recorderStream.value = stream || null;
    };

    const stopRecording = async () => {
      const stream = recorderStream.value;
      if (!stream) return;
      recorderStream.value = null;
      error.value = '';

      try {
        const blob = await stream();
        const f = new File(
          [blob],
          `voice_${new Date().toLocaleString()}`,
          {
            type: blob.type,
          }
        );
        files.value = [f];
      } catch (err) {
        console.error(err);
        error.value = String(err);
      }
    };

    const isRecording = computed(() => !!recorderStream.value);

    const download = () => {
      const f = file.value;
      if (!f) return;
      util.download(f, f.name);
    };

    const submit = async () => {
      if (submitting.value || !file.value) return;
      error.value = '';
      submitting.value = true;
      try {
        const resp = await util.request.upload('/speech-to-text', file.value);
        const d = await resp.json();
        text.value = d.data.text;
      } catch (err) {
        console.error(err);
        error.value = String(err);
      }
      submitting.value = false;
    };

    const play = async () => {
      if (!file.value) return;
      playing.value = true;
      util.playAudio(file.value).finally(() => playing.value = false);
    };

    return {
      submit,
      play,
      submitting,
      playing,
      isRecording,
      startRecording,
      stopRecording,
      error,
      text,
      file,
      files,
      download,
    };
  },
  template: `
    <v-card class="pa-4">
      <div class="d-flex justify-space-between">
        <div class="w-50 pr-4 pb-4">
          <div>
            <v-icon start icon="mdi-microphone"></v-icon>
            Record Real-time Voice
          </div>
          <div class="d-flex mt-4 flex-wrap" style="gap: 16px;">
            <v-btn @click="startRecording" :loading="isRecording" :disabled="submitting" prepend-icon="mdi-record-circle">
              record
            </v-btn>
            <v-btn @click="stopRecording" :disabled="!isRecording" prepend-icon="mdi-stop">
              stop
            </v-btn>
          </div>
        </div>
        <v-divider vertical />
        <div class="w-50 pl-4 pb-4">
          <div>
            <v-icon start icon="mdi-upload"></v-icon>
            Upload Voice File
          </div>
          <div class="mt-4">
            <v-file-input
              label="Audio File" v-model="files" :loading="submitting"
              accept="audio/*" variant="outlined" show-size hide-details="auto"
              append-icon="mdi-download" @click:append="download" density="compact"
            />
          </div>
        </div>        
      </div>
      <v-divider />
      <div class="d-flex mt-4 flex-wrap" style="gap: 16px;">
        <v-btn @click="submit" :loading="submitting" :disabled="isRecording || !file"
          color="teal-darken-1" prepend-icon="mdi-text-recognition">
          textualize
        </v-btn>
        <v-btn @click="play" :loading="playing" :disabled="isRecording || !file"
          prepend-icon="mdi-play">
          play
        </v-btn>
      </div>
      <v-alert class="mt-4" type="error" :text="error" :model-value="!!error"/>
      <v-alert class="mt-4" :text="text" :model-value="!!text"/>
    </v-card>
  `,
};

const App = {
  setup() {
    const { ref, watchEffect } = Vue;
    const TAB = {
      speak: 'speak',
      textualize: 'textualize',
    };

    const tab = ref(util.getURLParams('tab') || TAB.speak);

    watchEffect(() => {
      util.setURLParams('tab', tab.value);
    });

    return {
      TAB,
      tab,
    };
  },
  template: `
    <v-container>
      <div class="d-flex justify-center mb-4">
        <v-btn-toggle
          v-model="tab"
          color="cyan-lighten-4"
          density="compact"
        >
          <v-btn :value="TAB.speak">
            speak
          </v-btn>
          <v-btn :value="TAB.textualize">
            textualize
          </v-btn>
        </v-btn-toggle>
      </div>
      <div>
        <to-speech-app v-show="tab === TAB.speak"/>
        <to-text-app v-show="tab === TAB.textualize"/>
      </div>
    </v-container>
  `,
};

const { createApp } = Vue;
const { createVuetify } = Vuetify;

const vuetify = createVuetify();
const app = createApp(App);

app.component('ToSpeechApp', ToSpeechApp);
app.component('ToTextApp', ToTextApp);

app.use(vuetify).mount('#app');
