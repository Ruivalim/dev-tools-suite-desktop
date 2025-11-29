import { browser } from '$app/environment';

function createSidebarStore() {
  let collapsed = $state(false);

  if (browser) {
    const stored = localStorage.getItem('sidebar-collapsed');
    collapsed = stored === 'true';
  }

  return {
    get collapsed() {
      return collapsed;
    },
    toggle() {
      collapsed = !collapsed;
      if (browser) {
        localStorage.setItem('sidebar-collapsed', String(collapsed));
      }
    },
    expand() {
      collapsed = false;
      if (browser) {
        localStorage.setItem('sidebar-collapsed', 'false');
      }
    },
    collapse() {
      collapsed = true;
      if (browser) {
        localStorage.setItem('sidebar-collapsed', 'true');
      }
    }
  };
}

export const sidebarStore = createSidebarStore();
