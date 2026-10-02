import ui from '@nuxt/ui/vue-plugin';
import { createApp } from 'vue';
import App from './App.vue';
import './assets/main.css';

createApp(App).use(ui).mount('#app');
