import './styles.css';
import { Studio } from './ui/studio';

const root = document.querySelector('#app');
if (root instanceof HTMLElement) {
  const studio = new Studio(root);
  Object.assign(window, { __studio: studio });
  void studio.start();
}
