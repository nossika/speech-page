const { ref, computed } = Vue;

const util = {
  request: {
    post: async (url, data) => {
      const response = await window.fetch(url, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
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
              text.value = '';
            });
            break;
          case 'save':
            util.download(audio, `${text.value.slice(0, 10)}.mp3`);
            text.value = '';
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
    <div>
      <div>
        <v-textarea label="Some Text" variant="outlined" :value="text" @input="setText" :loading="loading"
          @keyup.ctrl.enter="submit" placeholder="Use Ctrl + Enter to submit" :prepend-inner-icon="playing ? 'mdi-account-voice' : 'mdi-comment'">
          <template v-slot:append>
            <div>
              <div>
                <v-radio-group inline density="compact" :model-value="submitType" @update:modelValue="setSubmitType">
                  <v-radio label="Play" value="play"></v-radio>
                  <v-radio label="Save" value="save"></v-radio>
                </v-radio-group>
              </div>
              <div style="display: flex; justify-content: center">
                <v-btn @click="submit" :loading="loading" :disabled="!text || playing">
                  SPEECH
                </v-btn>
              </div>
            </div>
          </template>
        </v-textarea>
      </div>
      <div>
        <v-alert type="error" :text="error" :model-value="!!error"/>
      </div>
    </div>
  `,
};

const ToTextApp = {
  setup() {
    const submitting = ref(false);
    const recorderStream = ref(null);
    const text = ref('');
    const error = ref('');
    const file = ref(null);

    const startRecording = async () => {
      const stream = await util.getRecorderStream();
      recorderStream.value = stream;
    };

    const stopRecording = async () => {
      const stream = recorderStream.value;
      if (!stream) return;
      recorderStream.value = null;
      error.value = '';

      try {
        const file = await stream();
        const resp = await submit(file);
        text.value = resp.data.text;
      } catch (err) {
        console.error(err);
        error.value = String(err);
      }
    };

    const isRecording = computed(() => !!recorderStream.value);

    const submit = async (file) => {
      submitting.value = true;
      const resp = await util.request.upload('/speech-to-text', file)
        .finally(() => {
          submitting.value = false;
        });

      return resp.json();
    };

    const setFile = (value) => {
      const f = value?.target.files[0] || null;
      file.value = f;
    };

    const upload = async () => {
      if (submitting.value) return;
      const f = file.value;
      if (!f) return;
      file.value = null;
      error.value = '';

      try {
        const resp = await submit(f);
        text.value = resp.data.text;
      } catch (err) {
        console.error(err);
        error.value = String(err);
      }
    };

    return {
      submitting,
      isRecording,
      startRecording,
      stopRecording,
      error,
      text,
      file,
      setFile,
      upload,
    };
  },
  template: `
    <div>
      <div>
        <div>
          Record Voice:
        </div>
        <div style="display: flex; gap: 10px;">
          <v-btn @click="startRecording" :loading="isRecording || submitting" prepend-icon="mdi-microphone">
            record
          </v-btn>
          <v-btn @click="stopRecording" :disabled="!isRecording" :loading="submitting" prepend-icon="mdi-upload">
            upload
          </v-btn>
        </div>
      </div>
      <div>
        <div>
          Upload Voice File:
        </div>
        <div>
          <v-file-input label="Audio File" @input="setFile" @click:clear="setFile(null)" :loading="submitting"
            accept="audio/*" variant="outlined" show-size append-icon="mdi-upload" @click:append="upload"/>
        </div>
      </div>
      <div>
        <v-alert type="error" :text="error" :model-value="!!error"/>
      </div>
      <div>
        <v-card :text="text" :loading="submitting"/>
      </div>
    </div>
  `,
};

const App = {
  setup() {
    const { ref, watchEffect } = Vue;
    const TAB = {
      toSpeech: 'to-speech',
      toText: 'to-text',
    };

    const params = new URLSearchParams(location.search);
    const tab = ref(params.get('tab') || TAB.toSpeech);

    watchEffect(() => {
      params.set('tab', tab.value);
      history.pushState(null, '', `?${params.toString()}`);
    });

    return {
      TAB,
      tab,
    };
  },
  template: `
    <v-container>
      <div style="margin-bottom: 20px; display: flex; justify-content: center;">
        <v-btn-toggle
          v-model="tab"
          color="cyan-lighten-4"
          density="compact"
        >
          <v-btn :value="TAB.toSpeech">
            to speech
          </v-btn>
          <v-btn :value="TAB.toText">
            to text
          </v-btn>
        </v-btn-toggle>
      </div>
      <div>
        <to-speech-app v-show="tab === TAB.toSpeech"/>
        <to-text-app v-show="tab === TAB.toText"/>
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
