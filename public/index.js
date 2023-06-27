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
      return response.json();
    },
    file: async (url, data) => {
      const response = await window.fetch(url, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.blob();
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
      const audio = document.createElement('audio');
      audio.src = url;
      audio.play();
      audio.addEventListener('error', (error) => {
        reject(error.error);
        URL.revokeObjectURL(url);
      })
      audio.addEventListener('ended', () => {
        resolve();
        URL.revokeObjectURL(url);
      });
    });
  },
};

const ToSpeechApp = {
  setup() {
    const { ref } = Vue;

    const loading = ref(false);
    const text = ref('');
    const submitType = ref('play');

    const submit = async () => {
      if (loading.value || !text.value) return;
      loading.value = true;

      try {
        const mp3 = await util.request.file('/text-to-speech', {
          text: text.value,
        });

        switch (submitType.value) {
          case 'play':
            util.playAudio(mp3);
            break;
          case 'save':
            util.download(mp3, `${text.value.slice(0, 10)}.mp3`);
            break;
        }
      } catch (err) {
        console.error(err);
      }

      text.value = '';
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
    };
  },
  template: `
    <div>
      <div>
        <v-textarea label="text to speech" variant="outlined" :value="text" @input="setText" @keyup.ctrl.enter="submit" placeholder="Use Ctrl + Enter to submit">
          <template v-slot:append>
            <div>
              <div>
                <v-radio-group inline density="compact" :model-value="submitType" @update:modelValue="setSubmitType">
                  <v-radio label="Play" value="play"></v-radio>
                  <v-radio label="Save" value="save"></v-radio>
                </v-radio-group>
              </div>
              <div style="display: flex; justify-content: center">
                <v-btn @click="submit" :loading="loading" :disabled="!text">
                  SPEECH
                </v-btn>
              </div>
            </div>
          </template>
        </v-textarea>
      </div>
    </div>
  `,
};

const ToTextApp = {
  setup() {
    return {

    };
  },
  template: `
    <div>
      TODO
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
