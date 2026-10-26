# Screen: examples

**B-roll of a website, no voice**

```js
export const length = 20;
export const segments = () => [{
  name: 'home', start: 0,
  windows: [{ account: '-', url: '/' }],
  beats: (w) => [
    [1.0, () => w.hover(w.role('link', { name: 'Pricing' }))],
    [3.0, () => w.scroll(700, 2500)],
    [9.0, () => w.click(w.role('link', { name: 'Pricing' }))],
    [13.0, () => w.scroll(500, 2000)],
  ],
}];
```

**An app demo timed to a voice**

```js
export const segments = (L) => [{
  name: 'tasks', start: 0,
  windows: [{ account: 'admin', url: '/boards/launch', screen: 'Launch board' }],
  setup: async (w) => { /* delete a leftover "Write the release notes" task */ },
  beats: (w) => [
    [L(1, 'new'), () => w.click(w.role('button', { name: 'New task' }))],
    [L(2, 'name'), () => w.type('Write the release notes')],
    [L(3, 'done'), () => w.click(w.role('checkbox', { name: 'Write the release notes' }))],
  ],
  cleanup: async (w) => { /* delete the task again */ },
}];
```

**Two windows: what the admin does, the user sees**

```js
windows: [
  { account: 'admin', url: '/boards/launch', view: { width: 1024, height: 1152 } },
  { account: 'user', url: '/boards/launch', view: { width: 1024, height: 1152 } },
],
beats: (admin, user) => [
  [L(4, 'assign'), () => admin.click(admin.role('button', { name: 'Assign to Sam' }))],
  [L(5, 'Sam'), () => user.hover(user.text('Assigned to you'))],
],
```
