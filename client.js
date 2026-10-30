/**
 * Git Control — browser half (read-only, JetBrains-style).
 *
 * A pure read-only Git panel for the Harness workspace: repository status
 * grouped by staged / working-tree / unversioned, per-file type icons and line
 * statistics, a numbered unified diff, a commit-graph log with a per-commit
 * detail inspector. No write operations are exposed anywhere in the UI.
 * Plain JavaScript, no build step.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-git-control',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback, useMemo, useRef } = React;

    const NS = 'git-control';
    const PANEL_ID = 'git';

    // ------------------------------------------------------------- palette
    // IntelliJ IDEA Darcula
    const C = {
      bg: '#2B2D30',
      panel: '#2B2D30',
      toolbar: '#3C3F41',
      gutter: '#313335',
      border: '#46484C',
      text: '#BBBBBB',
      textDim: '#808080',
      code: '#A9B7C6',
      selection: '#214283',
      hover: '#3C3F41',
      accent: '#4B6EAF',
      added: '#629755',
      modified: '#6897BB',
      deleted: '#C75450',
      untracked: '#808080',
      diffAddBg: '#1B5A33',
      diffDelBg: '#6A2A24',
      diffAddFg: '#A5C25C',
      diffDelFg: '#E8A7A3',
    };
    const GRAPH_COLORS = ['#589DF6', '#6CA56F', '#E48A3C', '#C75450', '#9B6BD0', '#4FC1C1'];

    // ------------------------------------------------------------- i18n
    const en = {
      panel: 'Git',
      title: 'Git',
      'tabs.changes': 'Changes',
      'tabs.log': 'Log',
      'repo.select': 'Repository',
      'repo.detached': 'detached',
      'repo.ahead': '{ahead} ahead · {behind} behind',
      'group.staged': 'Staged',
      'group.changes': 'Changes',
      'group.unversioned': 'Unversioned Files',
      'filter.placeholder': 'Filter files',
      'diff.select': 'Select a file to view its changes.',
      'diff.staged': 'Staged changes',
      'diff.unstaged': 'Uncommitted changes',
      'diff.both': 'Staged + working-tree changes',
      'diff.untracked': 'Unversioned file',
      'diff.empty': 'No changes in this file.',
      'diff.binary': 'Binary file — diff unavailable.',
      'log.empty': 'No commits yet',
      'log.detail': 'Commit',
      'log.files': '{n} files changed',
      'log.parents': '{n} parents',
      'loading': 'Loading…',
      'changes.limited': 'Showing {shown} of {total} changes',
      'error.load': 'Could not load repository state: {message}',
      'status.a': 'Added',
      'status.m': 'Modified',
      'status.d': 'Deleted',
      'status.r': 'Renamed',
      'status.c': 'Copied',
      'status.u': 'Unmerged',
      'status.untracked': 'Untracked',
    };
    const zh = {
      panel: 'Git',
      title: 'Git',
      'tabs.changes': 'Changes',
      'tabs.log': 'Log',
      'repo.select': '仓库',
      'repo.detached': '游离 HEAD',
      'repo.ahead': '领先 {ahead} · 落后 {behind}',
      'group.staged': 'Staged',
      'group.changes': 'Changes',
      'group.unversioned': 'Unversioned Files',
      'filter.placeholder': '过滤文件',
      'diff.select': '选择文件以查看其变更。',
      'diff.staged': '暂存区变更',
      'diff.unstaged': '未提交变更',
      'diff.both': '暂存 + 工作区变更',
      'diff.untracked': '未版本化文件',
      'diff.empty': '该文件没有差异。',
      'diff.binary': '二进制文件 —— 无法显示差异。',
      'log.empty': '还没有提交',
      'log.detail': '提交',
      'log.files': '共 {n} 个文件变更',
      'log.parents': '{n} 个父提交',
      'loading': '加载中……',
      'changes.limited': '仅显示 {shown} / {total} 项变更',
      'error.load': '无法加载仓库状态：{message}',
      'status.a': '新增',
      'status.m': '修改',
      'status.d': '删除',
      'status.r': '重命名',
      'status.c': '复制',
      'status.u': '冲突未合并',
      'status.untracked': '未跟踪',
    };

    // ------------------------------------------------------------- css
    const css = `
.jb-root{box-sizing:border-box;width:100%;min-width:0;height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:${C.bg};color:${C.text};font-size:13px;line-height:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"PingFang SC","Microsoft YaHei",sans-serif}
.jb-toolbar{flex:none;display:flex;align-items:center;gap:10px;height:38px;padding:0 10px;background:${C.toolbar};border-bottom:1px solid ${C.border}}
.jb-toolbar .jb-selectwrap{display:inline-flex;align-items:center;gap:6px;min-width:0}
.jb-toolbar svg.jb-tool-icon{flex:none;color:${C.text}}
.jb-select{box-sizing:border-box;height:26px;min-width:110px;max-width:220px;color:${C.text};background:${C.toolbar} url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' fill='none' stroke='%23808080' stroke-width='1.5' stroke-linecap='round'/></svg>") no-repeat right 7px center;border:1px solid ${C.border};border-radius:4px;font:inherit;font-size:12.5px;line-height:20px;padding:0 22px 0 8px;outline:none;cursor:pointer;appearance:none}
.jb-select:hover{border-color:#5A5C60}
.jb-select:focus{border-color:${C.accent}}
.jb-tb-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:none;border-radius:4px;background:transparent;color:${C.text};cursor:pointer;padding:0}
.jb-tb-btn:hover:not(:disabled){background:${C.hover}}
.jb-tb-btn:disabled{opacity:.45;cursor:default}
.jb-tb-btn svg{width:15px;height:15px}
.jb-branchinfo{display:inline-flex;align-items:center;gap:8px;min-width:0}
.jb-branchchip{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 10px;border-radius:12px;background:${C.gutter};border:1px solid ${C.border};color:${C.text};font-size:12.5px;font-weight:500;white-space:nowrap}
.jb-branchchip svg{width:13px;height:13px;color:${C.modified}}
.jb-headchip{color:${C.textDim};font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:nowrap}
.jb-spacer{flex:1}
.jb-tabs{flex:none;display:flex;align-items:stretch;height:33px;padding:0 8px;background:${C.bg};border-bottom:1px solid ${C.border}}
.jb-tab{display:inline-flex;align-items:center;padding:0 12px;color:${C.textDim};background:transparent;border:none;font:inherit;font-size:12.5px;cursor:pointer;position:relative}
.jb-tab:hover{color:${C.text}}
.jb-tab[data-active=true]{color:${C.text}}
.jb-tab[data-active=true]:after{content:"";position:absolute;left:10px;right:10px;bottom:0;height:2px;background:${C.accent}}
.jb-content{flex:1;min-height:0;display:flex}
.jb-changes{flex:1;min-width:0;display:flex}
.jb-tree{flex:none;width:340px;min-width:260px;overflow-y:auto;background:${C.panel};border-right:1px solid ${C.border};scrollbar-gutter:stable}
.jb-filter{box-sizing:border-box;display:flex;align-items:center;gap:6px;height:30px;margin:8px 10px;padding:0 8px;background:${C.toolbar};border:1px solid ${C.border};border-radius:4px}
.jb-filter svg{flex:none;width:14px;height:14px;color:${C.textDim}}
.jb-filter input{flex:1;min-width:0;height:100%;background:transparent;border:none;outline:none;color:${C.text};font:inherit;font-size:12.5px}
.jb-filter input::placeholder{color:${C.textDim}}
.jb-group-title{display:flex;align-items:center;gap:6px;height:28px;padding:0 10px;color:${C.text};font-weight:600;font-size:12.5px;white-space:nowrap}
.jb-group-title .jb-count{color:${C.textDim};font-weight:400}
.jb-tree-hint{color:${C.textDim};font-size:12px;padding:2px 10px 8px}
.jb-node{display:flex;align-items:center;gap:7px;height:24px;padding:0 6px;cursor:pointer;white-space:nowrap;user-select:none}
.jb-node:hover{background:${C.hover}}
.jb-node[data-selected=true]{background:${C.selection}}
.jb-node .jb-chevron{flex:none;width:12px;height:12px;color:${C.textDim};display:inline-flex;align-items:center;justify-content:center;transition:transform .1s}
.jb-node[data-open=true] .jb-chevron{transform:rotate(90deg)}
.jb-node .jb-folder{flex:none;color:${C.textDim}}
.jb-node .jb-dirname{overflow:hidden;text-overflow:ellipsis;color:${C.text}}
.jb-node .jb-fileicon{flex:none;width:16px;height:16px}
.jb-node .jb-fileicon-gray{color:#9A9A9A}
.jb-node .jb-fileicon-gray *{fill:currentColor;stroke:currentColor}
.jb-node .jb-filename{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.jb-node[data-status=A] .jb-filename{color:${C.added}}
.jb-node[data-status=M] .jb-filename{color:${C.modified}}
.jb-node[data-status=R] .jb-filename{color:${C.modified}}
.jb-node[data-status=C] .jb-filename{color:${C.modified}}
.jb-node[data-status=D] .jb-filename{color:${C.deleted}}
.jb-node[data-status=U] .jb-filename{color:${C.deleted}}
.jb-node[data-status=?] .jb-filename{color:${C.untracked}}
.jb-node[data-status=D] .jb-filename{text-decoration:line-through}
.jb-stats{flex:none;color:${C.textDim};font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.jb-detail{flex:1;min-width:0;display:flex;flex-direction:column}
.jb-diffwrap{flex:1;min-height:0;display:flex;flex-direction:column}
.jb-diffhead{flex:none;display:flex;align-items:center;gap:10px;height:34px;padding:0 14px;background:${C.gutter};border-bottom:1px solid ${C.border}}
.jb-diffpath{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${C.text};font-size:12.5px;font-weight:500}
.jb-difftag{flex:none;color:${C.textDim};font-size:12px}
.jb-diffstats{flex:none;color:${C.textDim};font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.jb-diffbody{flex:1;min-height:0;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:12.5px;line-height:19px;background:${C.panel}}
.jb-dline{display:flex;min-width:0}
.jb-dline-num{flex:none;width:44px;text-align:right;padding:0 8px 0 0;color:#606060;background:${C.gutter};user-select:none;border-right:1px solid ${C.border}}
.jb-dline-num2{flex:none;width:44px;text-align:right;padding:0 8px 0 0;color:#606060;background:${C.gutter};user-select:none;border-right:1px solid ${C.border}}
.jb-dline-text{flex:1;min-width:0;white-space:pre-wrap;word-break:break-all;padding:0 12px 0 8px}
.jb-dline-add .jb-dline-text{background:${C.diffAddBg};color:${C.diffAddFg}}
.jb-dline-add .jb-dline-num{background:${C.diffAddBg};color:#BFD9C0}
.jb-dline-add .jb-dline-num2{background:${C.diffAddBg};color:#BFD9C0}
.jb-dline-del .jb-dline-text{background:${C.diffDelBg};color:${C.diffDelFg}}
.jb-dline-del .jb-dline-num{background:${C.diffDelBg};color:#E0B4B1}
.jb-dline-del .jb-dline-num2{background:${C.diffDelBg};color:#E0B4B1}
.jb-dline-hunk .jb-dline-text{background:${C.gutter};color:${C.code}}
.jb-dline-hunk .jb-dline-num{background:${C.gutter}}
.jb-dline-hunk .jb-dline-num2{background:${C.gutter}}
.jb-dline-file .jb-dline-text{color:${C.textDim}}
.jb-dline-file .jb-dline-num{background:${C.gutter}}
.jb-dline-file .jb-dline-num2{background:${C.gutter}}
.jb-dline-ctx .jb-dline-text{color:${C.code}}
.jb-dline-meta .jb-dline-text{color:${C.textDim}}
.jb-diffempty{flex:1;display:flex;align-items:center;justify-content:center;color:${C.textDim};font-size:13px;background:${C.panel}}
.jb-notice{flex:none;display:flex;align-items:center;gap:6px;padding:6px 14px;font-size:12px;background:${C.toolbar};border-bottom:1px solid ${C.border};color:${C.text}}
.jb-notice-error{color:#E8A7A3}
.jb-empty{color:${C.textDim};padding:16px;font-size:13px;background:${C.panel}}
.jb-log{flex:1;min-width:0;display:flex;flex-direction:column;background:${C.panel}}
.jb-loghead{flex:none;display:flex;align-items:center;height:28px;padding:0 10px;background:${C.gutter};border-bottom:1px solid ${C.border};color:${C.textDim};font-size:12px;white-space:nowrap}
.jb-loghead .jb-col-graph{width:auto;min-width:40px}
.jb-loghead .jb-col-msg{flex:1;min-width:0}
.jb-loghead .jb-col-author{flex:none;width:150px}
.jb-loghead .jb-col-date{flex:none;width:130px;text-align:right}
.jb-loghead .jb-col-hash{flex:none;width:72px;text-align:right}
.jb-logbody{flex:1;min-height:0;overflow:auto}
.jb-logrow{display:flex;align-items:center;height:24px;padding:0 10px;white-space:nowrap;cursor:pointer}
.jb-logrow:hover{background:${C.hover}}
.jb-logrow[data-selected=true]{background:${C.selection}}
.jb-logrow .jb-col-graph{flex:none;width:auto;min-width:40px;display:flex;align-items:center}
.jb-logrow .jb-col-msg{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;color:${C.text}}
.jb-logrow .jb-col-author{flex:none;width:150px;overflow:hidden;text-overflow:ellipsis;color:${C.textDim}}
.jb-logrow .jb-col-date{flex:none;width:130px;text-align:right;color:${C.textDim}}
.jb-logrow .jb-col-hash{flex:none;width:72px;text-align:right;color:${C.textDim};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
.jb-logdetail{flex:none;height:46%;min-height:220px;display:flex;flex-direction:column;border-top:1px solid ${C.border};background:${C.panel}}
.jb-logdetail-head{flex:none;display:flex;align-items:center;gap:10px;min-height:34px;padding:0 14px;background:${C.gutter};border-bottom:1px solid ${C.border}}
.jb-logdetail-subject{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${C.text};font-size:12.5px;font-weight:500}
.jb-logdetail-meta{flex:none;padding:6px 14px 0;color:${C.textDim};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.jb-detail-files{flex:none;max-height:130px;overflow:auto;margin:8px 14px 0;border:1px solid ${C.border};border-radius:6px}
.jb-detail-fileshead{height:24px;padding:0 8px;display:flex;align-items:center;color:${C.textDim};font-size:11px;text-transform:uppercase;letter-spacing:.02em;border-bottom:1px solid ${C.border}}
.jb-dfile{display:flex;align-items:center;gap:8px;height:22px;padding:0 8px;font-size:12px}
.jb-dfile:hover{background:${C.hover}}
.jb-dfile-stats{flex:none;color:${C.textDim};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}
.jb-dfile-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jb-branchchip-log{display:inline-flex;align-items:center;height:16px;margin:0 0 0 6px;padding:0 6px;border-radius:8px;background:${C.accent};color:#FFFFFF;font-size:11px;line-height:16px;font-weight:500}
.jb-loghash{flex:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:18px;color:${C.textDim};background:${C.panel};border:1px solid ${C.border};border-radius:6px;padding:1px 6px}
`;

    // ------------------------------------------------------------- file icons
    // File-type icons from vscode-icons (MIT License). Geometry converted to a
    // compact shape table; gradients resolved to solid colors.
const FILE_ICONS = {typescript:[['path',{fill:"#007acc",d:"M23.827 8.243a4.4 4.4 0 0 1 2.223 1.281 6 6 0 0 1 .852 1.143c.011.045-1.534 1.083-2.471 1.662-.034.023-.169-.124-.322-.35a2.01 2.01 0 0 0-1.67-1c-1.077-.074-1.771.49-1.766 1.433a1.3 1.3 0 0 0 .153.666c.237.49.677.784 2.059 1.383 2.544 1.095 3.636 1.817 4.31 2.843a5.16 5.16 0 0 1 .416 4.333 4.76 4.76 0 0 1-3.932 2.815 11 11 0 0 1-2.708-.028 6.53 6.53 0 0 1-3.616-1.884 6.3 6.3 0 0 1-.926-1.371 3 3 0 0 1 .327-.208c.158-.09.756-.434 1.32-.761l1.024-.6.214.312a4.8 4.8 0 0 0 1.35 1.292 3.3 3.3 0 0 0 3.458-.175 1.545 1.545 0 0 0 .2-1.974c-.276-.395-.84-.727-2.443-1.422a8.8 8.8 0 0 1-3.349-2.055 4.7 4.7 0 0 1-.976-1.777 7.1 7.1 0 0 1-.062-2.268 4.33 4.33 0 0 1 3.644-3.374 9 9 0 0 1 2.691.084m-8.343 1.483.011 1.454h-4.63v13.148H7.6V11.183H2.97V9.755a14 14 0 0 1 .04-1.466c.017-.023 2.832-.034 6.245-.028l6.211.017Z"}]],js:[['path',{fill:"#f5de19",d:"M18.774 19.7a3.73 3.73 0 0 0 3.376 2.078c1.418 0 2.324-.709 2.324-1.688 0-1.173-.931-1.589-2.491-2.272l-.856-.367c-2.469-1.052-4.11-2.37-4.11-5.156 0-2.567 1.956-4.52 5.012-4.52A5.06 5.06 0 0 1 26.9 10.52l-2.665 1.711a2.33 2.33 0 0 0-2.2-1.467 1.49 1.49 0 0 0-1.638 1.467c0 1.027.636 1.442 2.1 2.078l.856.366c2.908 1.247 4.549 2.518 4.549 5.376 0 3.081-2.42 4.769-5.671 4.769a6.58 6.58 0 0 1-6.236-3.5ZM6.686 20c.538.954 1.027 1.76 2.2 1.76 1.124 0 1.834-.44 1.834-2.15V7.975h3.422v11.683c0 3.543-2.078 5.156-5.11 5.156A5.31 5.31 0 0 1 3.9 21.688Z"}]],json:[['path',{fill:"#f5de19",d:"M4.014 14.976a2.5 2.5 0 0 0 1.567-.518 2.38 2.38 0 0 0 .805-1.358 15.3 15.3 0 0 0 .214-2.944q.012-2.085.075-2.747a5.2 5.2 0 0 1 .418-1.686 3 3 0 0 1 .755-1.018A3.05 3.05 0 0 1 9 4.125 6.8 6.8 0 0 1 10.544 4h.7v1.96h-.387a2.34 2.34 0 0 0-1.723.468 3.4 3.4 0 0 0-.425 2.092 36 36 0 0 1-.137 4.133 4.7 4.7 0 0 1-.768 2.06A4.6 4.6 0 0 1 6.1 16a3.8 3.8 0 0 1 1.992 1.754 8.9 8.9 0 0 1 .618 3.865q0 2.435.05 2.9a1.76 1.76 0 0 0 .504 1.181 2.64 2.64 0 0 0 1.592.337h.387V28h-.7a5.7 5.7 0 0 1-1.773-.2 2.97 2.97 0 0 1-1.324-.93 3.35 3.35 0 0 1-.681-1.63 24 24 0 0 1-.165-3.234 16.5 16.5 0 0 0-.214-3.106 2.4 2.4 0 0 0-.805-1.361 2.5 2.5 0 0 0-1.567-.524Zm23.972 2.035a2.5 2.5 0 0 0-1.567.524 2.4 2.4 0 0 0-.805 1.361 16.5 16.5 0 0 0-.212 3.109 24 24 0 0 1-.169 3.234 3.35 3.35 0 0 1-.681 1.63 2.97 2.97 0 0 1-1.324.93 5.7 5.7 0 0 1-1.773.2h-.7V26.04h.387a2.64 2.64 0 0 0 1.592-.337 1.76 1.76 0 0 0 .506-1.186q.05-.462.05-2.9a8.9 8.9 0 0 1 .618-3.865A3.8 3.8 0 0 1 25.9 16a4.6 4.6 0 0 1-1.7-1.286 4.7 4.7 0 0 1-.768-2.06 36 36 0 0 1-.137-4.133 3.4 3.4 0 0 0-.425-2.092 2.34 2.34 0 0 0-1.723-.468h-.387V4h.7a6.8 6.8 0 0 1 1.54.125 3.05 3.05 0 0 1 1.149.581 3 3 0 0 1 .755 1.018 5.2 5.2 0 0 1 .418 1.686q.062.662.075 2.747a15.3 15.3 0 0 0 .212 2.947 2.38 2.38 0 0 0 .805 1.355 2.5 2.5 0 0 0 1.567.518Z"}]],markdown:[['path',{stroke:"#755838",d:"M2.5 7.955h27v16.091h-27z"}],['path',{fill:"#755838",d:"M5.909 20.636v-9.272h2.727l2.728 3.409 2.727-3.409h2.727v9.272h-2.727v-5.318l-2.727 3.409-2.728-3.409v5.318zm17.046 0-4.091-4.5h2.727v-4.772h2.727v4.772h2.727z"}]],yaml:[['path',{fill:"#ffe885",d:"M2 12.218c.755 0 1.51-.008 2.264 0l.053.038 2.761 2.758c.891-.906 1.8-1.794 2.7-2.7.053-.052.11-.113.192-.1h1.823a1.4 1.4 0 0 1 .353.019c-.7.67-1.377 1.369-2.069 2.05L5.545 18.8c-.331.324-.648.663-.989.975-.754.022-1.511.007-2.266.007 1.223-1.209 2.431-2.433 3.658-3.637-1.321-1.304-2.63-2.62-3.948-3.927m10.7 0h1.839v7.566c-.611 0-1.222.012-1.832-.008v-4.994c-1.6 1.607-3.209 3.2-4.811 4.8-.089.08-.166.217-.305.194-.824-.006-1.649 0-2.474 0Q8.916 16 12.7 12.218m2.258.002c.47-.009.939 0 1.409 0 .836.853 1.69 1.689 2.536 2.532q1.268-1.267 2.539-2.532h1.4q-.008 3.784 0 7.567c-.471 0-.943.006-1.414 0q.008-2.387 0-4.773c-.844.843-1.676 1.7-2.526 2.536-.856-.835-1.687-1.695-2.532-2.541 0 1.594-.006 3.188.006 4.781-.472 0-.943.005-1.415 0q-.003-3.79-.003-7.57m8.301-.003c.472 0 .944-.007 1.416 0q-.007 3.083 0 6.166h3.782c.063.006.144-.012.191.045.448.454.907.9 1.353 1.354q-3.371.007-6.741 0 .007-3.782-.001-7.565"}]],python:[['path',{fill:"#387eb8",d:"M15.885 2.1c-7.1 0-6.651 3.07-6.651 3.07v3.19h6.752v1H6.545S2 8.8 2 16.005s4.013 6.912 4.013 6.912H8.33v-3.361s-.13-4.013 3.9-4.013h6.762s3.772.06 3.772-3.652V5.8s.572-3.712-6.842-3.712Zm-3.732 2.137a1.214 1.214 0 1 1-1.183 1.244v-.02a1.214 1.214 0 0 1 1.214-1.214Z"}],['path',{fill:"#ffe052",d:"M16.085 29.91c7.1 0 6.651-3.08 6.651-3.08v-3.18h-6.751v-1h9.47S30 23.158 30 15.995s-4.013-6.912-4.013-6.912H23.64V12.4s.13 4.013-3.9 4.013h-6.765S9.2 16.356 9.2 20.068V26.2s-.572 3.712 6.842 3.712h.04Zm3.732-2.147A1.214 1.214 0 1 1 21 26.519v.03a1.214 1.214 0 0 1-1.214 1.214z"}]],go:[['path',{fill:"#00acd7",d:"M0 12.32h1.64q.12.02.06.12l-.34.5a.3.3 0 0 1-.2.12H0zm0 1.8h.62a.1.1 0 0 1 .1.12l-.16.46a.2.2 0 0 1-.17.12H0zm0 1.8h.19q.12 0 .12.13l-.04.47a.15.15 0 0 1-.14.14H0zm16.15-3.22c-1.23.3-2.07.54-3.28.85-.3.08-.32.1-.57-.2-.3-.32-.5-.54-.92-.73a3.4 3.4 0 0 0-3.53.29 4.2 4.2 0 0 0-2 3.7 3.1 3.1 0 0 0 2.64 3.07 3.6 3.6 0 0 0 3.32-1.28q.25-.32.53-.73H8.57c-.41 0-.5-.25-.37-.58.25-.6.72-1.62 1-2.13a.5.5 0 0 1 .48-.31h7.11c-.04.52-.04 1.05-.11 1.58a8.3 8.3 0 0 1-1.6 3.83 8.2 8.2 0 0 1-5.57 3.32 7 7 0 0 1-5.26-1.3 6 6 0 0 1-2.48-4.33 7.7 7.7 0 0 1 1.66-5.72q2.1-2.75 5.47-3.38a6.7 6.7 0 0 1 5.18.96 6 6 0 0 1 2.26 2.75q.17.25-.2.33m6.47 10.81a7.3 7.3 0 0 1-4.76-1.73 6 6 0 0 1-2.11-3.76 7.5 7.5 0 0 1 1.58-5.9 8 8 0 0 1 5.47-3.26 7.2 7.2 0 0 1 5.56 1 6 6 0 0 1 2.76 4.35 7.6 7.6 0 0 1-2.25 6.62 9 9 0 0 1-4.69 2.5c-.52.1-1.05.11-1.56.17m4.65-7.9-.06-.64a3.2 3.2 0 0 0-3.98-2.6c-1.82.41-3 1.56-3.42 3.4a3.2 3.2 0 0 0 1.8 3.69q1.61.69 3.18-.12 2.32-1.2 2.48-3.73"}]],rust:[['path',{fill:"#7d7d7d",d:"M15.124 5.3a.832.832 0 1 1 .832.832.83.83 0 0 1-.832-.832M5.2 12.834a.832.832 0 1 1 .832.832.83.83 0 0 1-.832-.832m19.856.039a.832.832 0 1 1 .832.832.83.83 0 0 1-.832-.832m-17.451 1.14a.76.76 0 0 0 .386-1l-.369-.835h1.452v6.545h-2.93a10.3 10.3 0 0 1-.332-3.911Zm6.074.161v-1.929h3.458c.179 0 1.261.206 1.261 1.016 0 .672-.83.913-1.513.913ZM8.958 24.561a.832.832 0 1 1 .832.832.83.83 0 0 1-.832-.832m12.331.039a.832.832 0 1 1 .832.832.83.83 0 0 1-.832-.832m.257-1.887a.76.76 0 0 0-.9.584l-.418 1.949a10.25 10.25 0 0 1-8.545-.041l-.417-1.949a.76.76 0 0 0-.9-.583l-1.721.37a10 10 0 0 1-.89-1.049h8.374c.095 0 .158-.017.158-.1v-2.966c0-.086-.063-.1-.158-.1h-2.45v-1.881h2.649a1.665 1.665 0 0 1 1.629 1.412c.105.413.336 1.757.494 2.187.157.483.8 1.447 1.482 1.447h4.323a10 10 0 0 1-.949 1.1Zm4.65-7.821a10.3 10.3 0 0 1 .022 1.779h-1.051c-.105 0-.148.069-.148.172v.483c0 1.136-.641 1.384-1.2 1.447-.535.06-1.128-.224-1.2-.551a3.62 3.62 0 0 0-1.671-2.808c1.03-.654 2.1-1.619 2.1-2.911A3.29 3.29 0 0 0 21.44 9.8a4.56 4.56 0 0 0-2.2-.724H8.367A10.25 10.25 0 0 1 14.1 5.84l1.282 1.344a.76.76 0 0 0 1.072.026l1.434-1.372a10.25 10.25 0 0 1 7.015 5l-.982 2.217a.76.76 0 0 0 .386 1Zm2.448.036-.033-.343 1.011-.943a.42.42 0 0 0-.013-.595.4.4 0 0 0-.121-.081l-1.288-.483-.1-.334.806-1.12a.42.42 0 0 0-.13-.581.4.4 0 0 0-.133-.055l-1.363-.222-.164-.306.573-1.257a.42.42 0 0 0-.236-.544.4.4 0 0 0-.146-.029l-1.383.048-.224-.264.318-1.347a.42.42 0 0 0-.343-.487.4.4 0 0 0-.144 0l-1.348.315-.266-.219.049-1.381a.42.42 0 0 0-.431-.411.4.4 0 0 0-.141.028l-1.257.573-.306-.164-.222-1.363a.42.42 0 0 0-.5-.318.4.4 0 0 0-.133.055l-1.121.806-.333-.1-.483-1.293a.42.42 0 0 0-.555-.215.4.4 0 0 0-.12.08l-.946 1.012-.343-.033-.728-1.177a.42.42 0 0 0-.688 0l-.728 1.177-.343.033-.943-1.012a.42.42 0 0 0-.595.015.4.4 0 0 0-.08.12L12.483 3.8l-.333.1-1.12-.8a.42.42 0 0 0-.581.13.4.4 0 0 0-.055.133l-.222 1.363-.306.164-1.258-.573a.42.42 0 0 0-.544.239.4.4 0 0 0-.028.144l.048 1.383-.266.217-1.347-.316a.42.42 0 0 0-.487.343.4.4 0 0 0 0 .144L6.3 7.819l-.218.265L4.7 8.036a.422.422 0 0 0-.383.573l.573 1.257-.164.306-1.363.222a.42.42 0 0 0-.318.5.4.4 0 0 0 .055.133l.806 1.12-.1.334-1.293.483a.42.42 0 0 0-.215.555.4.4 0 0 0 .081.121l1.011.943-.033.343-1.177.728a.42.42 0 0 0 0 .688l1.177.728.033.343-1.011.943a.42.42 0 0 0 .015.595.4.4 0 0 0 .119.08l1.293.483.1.334-.806 1.124a.42.42 0 0 0 .131.581.4.4 0 0 0 .133.055l1.363.222.164.307-.573 1.257a.42.42 0 0 0 .24.545.4.4 0 0 0 .143.028l1.383-.048.219.266-.317 1.348a.42.42 0 0 0 .341.486.4.4 0 0 0 .146 0l1.345-.319.266.218-.049 1.382a.42.42 0 0 0 .429.41.4.4 0 0 0 .143-.028l1.257-.573.306.164.222 1.362a.42.42 0 0 0 .5.319.4.4 0 0 0 .133-.055l1.12-.807.334.1.483 1.292a.42.42 0 0 0 .556.214.4.4 0 0 0 .119-.08l.943-1.011.343.034.728 1.177a.42.42 0 0 0 .588.1.4.4 0 0 0 .1-.1l.728-1.177.343-.034.943 1.011a.42.42 0 0 0 .595-.015.4.4 0 0 0 .08-.119l.483-1.292.334-.1 1.12.807a.42.42 0 0 0 .581-.131.4.4 0 0 0 .055-.133l.222-1.362.306-.164 1.257.573a.42.42 0 0 0 .544-.239.4.4 0 0 0 .028-.143l-.048-1.384.265-.218 1.347.317a.42.42 0 0 0 .487-.34.5.5 0 0 0 0-.146l-.309-1.346.218-.266 1.383.048a.42.42 0 0 0 .41-.431.4.4 0 0 0-.028-.142l-.573-1.257.164-.307 1.363-.222a.42.42 0 0 0 .319-.5.4.4 0 0 0-.056-.135l-.806-1.12.1-.334 1.293-.483a.42.42 0 0 0 .215-.554.4.4 0 0 0-.081-.121l-1.011-.943.033-.343 1.177-.728a.42.42 0 0 0 0-.688Z"}]],shell:[['path',{fill:"#d9b400",d:"M29.4 27.6H2.5V4.5h26.9Zm-25.9-1h24.9V5.5H3.5Z"}],['path',{fill:"#d9b400",d:"m6.077 19.316-.555-.832 4.844-3.229-4.887-4.071.641-.768 5.915 4.928zM12.7 18.2h7.8v1h-7.8zM2.5 5.5h26.9v1.9H2.5z"}]],html:[['path',{fill:"#e44f26",d:"M5.902 27.201 3.655 2h24.69l-2.25 25.197L15.985 30z"}],['path',{fill:"#f1662a",d:"m16 27.858 8.17-2.265 1.922-21.532H16z"}],['path',{fill:"#ebebeb",d:"M16 13.407h-4.09l-.282-3.165H16V7.151H8.25l.074.83.759 8.517H16zm0 8.027-.014.004-3.442-.929-.22-2.465H9.221l.433 4.852 6.332 1.758.014-.004z"}],['path',{fill:"#fff",d:"M15.989 13.407v3.091h3.806l-.358 4.009-3.448.93v3.216l6.337-1.757.046-.522.726-8.137.076-.83zm0-6.256v3.091h7.466l.062-.694.141-1.567.074-.83z"}]],css:[['path',{fill:"#639",d:"M1.995 1.994h23.52a4.48 4.48 0 0 1 4.48 4.48v19.04a4.48 4.48 0 0 1-4.48 4.48H6.475a4.48 4.48 0 0 1-4.48-4.48Z"}],['path',{fill:"#fff",d:"M9.079 24.87v-4.704c0-1.876 1.204-2.884 3.024-2.884 1.792-.028 2.912 1.148 2.856 3.136h-2.072c.056-.756-.28-1.316-.84-1.288-.7 0-.896.476-.896 1.372v4.088c0 .868.28 1.288.896 1.316.644 0 .896-.644.84-1.372h2.072c.112 2.044-1.176 3.248-2.996 3.22-1.764 0-2.884-.98-2.884-2.884m6.636-.336h1.932c.028.896.308 1.456.924 1.456s.84-.364.84-1.204c0-.7-.308-1.092-1.064-1.456l-.728-.336c-1.288-.616-1.82-1.372-1.82-2.884 0-1.68 1.064-2.856 2.8-2.856s2.66 1.204 2.688 3.164h-1.876c0-.812-.168-1.372-.784-1.372-.56 0-.84.28-.84.98s.252.98.924 1.26l.672.308c1.428.672 2.044 1.54 2.044 3.164 0 1.932-1.092 2.996-2.884 2.996s-2.8-1.232-2.828-3.22m6.328 0h1.96c0 .896.308 1.456.896 1.456s.84-.364.84-1.204c0-.7-.28-1.092-1.064-1.456l-.728-.336c-1.288-.616-1.792-1.372-1.792-2.884 0-1.68 1.036-2.856 2.8-2.856s2.632 1.204 2.688 3.164h-1.876c-.028-.812-.196-1.372-.812-1.372-.56 0-.812.28-.812.98s.224.98.896 1.26l.7.308c1.4.672 2.016 1.54 2.016 3.164 0 1.932-1.092 2.996-2.884 2.996s-2.8-1.232-2.828-3.22"}]],sass:[['path',{fill:"#cd6799",d:"M26.11 17.572a5.8 5.8 0 0 0-2.537.588 5.4 5.4 0 0 1-.568-1.314 3.5 3.5 0 0 1-.051-1.1 10 10 0 0 1 .332-1.192c-.005-.051-.061-.292-.624-.3s-1.048.107-1.1.256a6 6 0 0 0-.235.834 19.7 19.7 0 0 1-1.713 3.294 3.2 3.2 0 0 1-.44-2.066 10 10 0 0 1 .332-1.192c-.005-.051-.061-.292-.624-.3s-1.048.107-1.1.256-.118.5-.235.834-1.483 3.386-1.841 4.173c-.184.4-.343.726-.455.946a.2.2 0 0 1-.02.041l-.153.292v.005c-.077.138-.159.266-.2.266a1.7 1.7 0 0 1 .01-.869c.2-1.059.69-2.705.685-2.762 0-.031.092-.317-.317-.465a.51.51 0 0 0-.578.1c-.036 0-.061.087-.061.087s.445-1.851-.849-1.851a3.86 3.86 0 0 0-2.475 1.683c-.348.189-1.089.593-1.882 1.028-.3.169-.614.338-.905.5-.02-.02-.041-.046-.061-.066C6.87 17.6 3.975 16.416 4.1 14.171c.046-.818.327-2.966 5.559-5.575 4.306-2.122 7.733-1.534 8.326-.23.849 1.862-1.836 5.319-6.285 5.82a3.35 3.35 0 0 1-2.813-.711c-.235-.256-.271-.271-.358-.22-.143.077-.051.307 0 .44a2.63 2.63 0 0 0 1.606 1.263 8.55 8.55 0 0 0 5.217-.517c2.7-1.043 4.8-3.943 4.184-6.372-.619-2.465-4.71-3.278-8.582-1.9a19.5 19.5 0 0 0-6.595 3.783c-2.133 1.995-2.47 3.728-2.332 4.455.5 2.578 4.051 4.255 5.472 5.5l-.194.107c-.711.353-3.421 1.77-4.1 3.268-.767 1.7.123 2.915.711 3.079a4.37 4.37 0 0 0 4.71-1.908 4.72 4.72 0 0 0 .423-4.353.1.1 0 0 0-.02-.031l.557-.327a27 27 0 0 1 1.028-.578 6.7 6.7 0 0 0-.363 1.862 3.9 3.9 0 0 0 .834 2.7.92.92 0 0 0 .675.22c.6 0 .875-.5 1.176-1.094.368-.726.7-1.57.7-1.57s-.414 2.281.711 2.281c.409 0 .823-.532 1.008-.8v.005l.031-.051.066-.107v-.01c.164-.286.532-.936 1.079-2.015.706-1.391 1.386-3.13 1.386-3.13a9 9 0 0 0 .271 1.13 11 11 0 0 0 .583 1.309c-.164.23-.266.358-.266.358l.005.005c-.133.174-.276.363-.435.547a16 16 0 0 0-1.314 1.647.447.447 0 0 0 .123.6 1.1 1.1 0 0 0 .685.113 3.2 3.2 0 0 0 1.028-.235 3.5 3.5 0 0 0 .885-.465 1.98 1.98 0 0 0 .849-1.744 3.5 3.5 0 0 0-.322-1.233q.076-.107.148-.215a23 23 0 0 0 1.534-2.649 9 9 0 0 0 .271 1.13 7.6 7.6 0 0 0 .5 1.125 4.86 4.86 0 0 0-1.497 1.922c-.322.931-.072 1.35.4 1.447a1.4 1.4 0 0 0 .747-.153 3.4 3.4 0 0 0 .946-.486 2.13 2.13 0 0 0 1.043-1.729 3.3 3.3 0 0 0-.235-1.023 5.36 5.36 0 0 1 2.716-.312c2.434.286 2.915 1.805 2.823 2.445a1.62 1.62 0 0 1-.772 1.094c-.169.107-.225.143-.21.22.02.113.1.107.245.087A1.9 1.9 0 0 0 30 20.7c.077-1.5-1.355-3.145-3.887-3.13ZM7.33 23.9c-.808.88-1.933 1.212-2.419.931-.522-.3-.317-1.6.675-2.532a13 13 0 0 1 1.9-1.417c.118-.072.292-.174.5-.3l.056-.031.123-.077A3.49 3.49 0 0 1 7.33 23.9m5.881-4c-.281.685-.869 2.44-1.227 2.342-.307-.082-.5-1.412-.061-2.726a6.2 6.2 0 0 1 .956-1.754c.44-.491.926-.655 1.043-.455a9 9 0 0 1-.711 2.593m4.853 2.322c-.118.061-.23.1-.281.072-.036-.02.051-.1.051-.1s.609-.655.849-.951c.138-.174.3-.378.476-.609v.066c0 .782-.757 1.309-1.094 1.524Zm3.744-.854c-.087-.061-.072-.266.22-.905a3.4 3.4 0 0 1 .834-1.074 1.5 1.5 0 0 1 .082.471 1.55 1.55 0 0 1-1.135 1.509Z"}]],vue:[['path',{fill:"#41b883",d:"M24.4 3.925H30l-14 24.15L2 3.925h10.71l3.29 5.6 3.22-5.6Z"}],['path',{fill:"#41b883",d:"m2 3.925 14 24.15 14-24.15h-5.6L16 18.415 7.53 3.925Z"}],['path',{fill:"#35495e",d:"M7.53 3.925 16 18.485l8.4-14.56h-5.18L16 9.525l-3.29-5.6Z"}]],svg:[['path',{fill:"#ffb13b",stroke:"#000",d:"M7.674 14.488a2.218 2.218 0 1 0 0 3.137h16.652a2.218 2.218 0 1 0 0-3.137Z"}],['path',{fill:"#ffb13b",stroke:"#000",d:"M11.222 9.06A2.218 2.218 0 1 0 9 11.278l11.778 11.774A2.218 2.218 0 1 0 23 20.834Z"}],['path',{fill:"#ffb13b",stroke:"#000",d:"M17.568 7.73a2.218 2.218 0 1 0-3.137 0v16.652a2.218 2.218 0 1 0 3.137 0Z"}],['path',{fill:"#ffb13b",stroke:"#000",d:"M23 11.278a2.218 2.218 0 1 0-2.222-2.218L9 20.834a2.218 2.218 0 1 0 2.218 2.218Z"}],['path',{fill:"#ffb13b",d:"M7.674 14.488a2.218 2.218 0 1 0 0 3.137h16.652a2.218 2.218 0 1 0 0-3.137Z"}],['path',{fill:"#ffb13b",d:"M11.222 9.06A2.218 2.218 0 1 0 9 11.278l11.778 11.774A2.218 2.218 0 1 0 23 20.834Z"}],['path',{fill:"#ffb13b",d:"M17.568 7.73a2.218 2.218 0 1 0-3.137 0v16.652a2.218 2.218 0 1 0 3.137 0Z"}],['path',{fill:"#ffb13b",d:"M23 11.278a2.218 2.218 0 1 0-2.222-2.218L9 20.834a2.218 2.218 0 1 0 2.218 2.218Z"}],['path',{fill:"#fff",d:"M6.2 23.045a3.628 3.628 0 1 1 6.2-2.565h-2.13a1.5 1.5 0 1 0-2.57 1.061 1.6 1.6 0 0 0 1.062.441 4.12 4.12 0 0 1 2.566 1.063 3.628 3.628 0 1 1-6.194 2.565h2.13a1.5 1.5 0 1 0 2.566-1.06 1.95 1.95 0 0 0-1.063-.44A4.47 4.47 0 0 1 6.2 23.045m13.451-6.193L17.085 29.24H14.96L12.4 16.852h2.12l1.5 7.255 1.5-7.255Zm3.629 5.131h3.628v3.628a3.628 3.628 0 1 1-7.257 0V20.48a3.628 3.628 0 0 1 7.257 0h-2.125a1.5 1.5 0 1 0-3.005 0v5.13a1.5 1.5 0 0 0 3.005 0v-1.5h-1.5v-2.127Z"}]],image:[['path',{fill:"#2dcc9f",d:"M30 5.851v20.298H2V5.851z"}],['path',{fill:"#fff",d:"M24.232 8.541a2.2 2.2 0 1 0 1.127.623 2.2 2.2 0 0 0-1.127-.623M18.111 20.1q-2.724-3.788-5.45-7.575L4.579 23.766h10.9q1.316-1.832 2.634-3.663M22.057 16q-2.793 3.882-5.584 7.765h11.169Q24.851 19.882 22.057 16"}]],text:[['path',{fill:"#c2c2c2",d:"M22.038 2H6.375a1.755 1.755 0 0 0-1.75 1.75v24.5A1.755 1.755 0 0 0 6.375 30h19.25a1.755 1.755 0 0 0 1.75-1.75V6.856Zm.525 2.844 1.663 1.531h-1.663ZM6.375 28.25V3.75h14.438v4.375h4.813V28.25Z"}],['path',{fill:"#829ec2",d:"M8.125 15.097h13.076v1.75H8.125zm0 9.342h9.762v1.75H8.125zm0-4.676h15.75v1.75H8.125zm0-9.533h15.75v1.75H8.125z"}]],csv:[['path',{fill:"#91d290",d:"M22.038 2H6.375a1.755 1.755 0 0 0-1.75 1.75v24.5A1.755 1.755 0 0 0 6.375 30h19.25a1.755 1.755 0 0 0 1.75-1.75V6.856Zm.525 2.844 1.663 1.531h-1.663ZM6.375 28.25V3.75h14.438v4.375h4.813V28.25Z"}],['path',{fill:"#73b568",d:"M8.125 15.097h13.076v1.75H8.125zm0 9.342h9.762v1.75H8.125zm0-4.676h15.75v1.75H8.125zm0-9.533h15.75v1.75H8.125z"}]],sql:[['path',{fill:"#ffda44",d:"M8.562 15.256A21.2 21.2 0 0 0 16 16.449a21.2 21.2 0 0 0 7.438-1.194c1.864-.727 2.525-1.535 2.525-2V9.7a10.4 10.4 0 0 1-2.084 1.076A22.3 22.3 0 0 1 16 12.078a22.4 22.4 0 0 1-7.879-1.3A10.3 10.3 0 0 1 6.037 9.7v3.55c0 .474.663 1.278 2.525 2.006m0 6.705a15.6 15.6 0 0 0 2.6.741 25 25 0 0 0 4.838.453 25 25 0 0 0 4.838-.452 15.6 15.6 0 0 0 2.6-.741c1.864-.727 2.525-1.535 2.525-2v-3.39a10.7 10.7 0 0 1-1.692.825A23.5 23.5 0 0 1 16 18.74a23.5 23.5 0 0 1-8.271-1.348 11 11 0 0 1-1.692-.825v3.393c0 .466.663 1.271 2.525 2.001M16 30c5.5 0 9.963-1.744 9.963-3.894v-2.837a10.5 10.5 0 0 1-1.535.762l-.157.063A23.5 23.5 0 0 1 16 25.445a23.4 23.4 0 0 1-8.271-1.351l-.157-.063a10.5 10.5 0 0 1-1.535-.762v2.837C6.037 28.256 10.5 30 16 30"}],['ellipse',{cx:'16',cy:'5.894',fill:"#ffda44",rx:'9.963',ry:'3.894'}]],xml:[['path',{fill:"#f1662a",d:"m20.42 21.157 2.211 2.211L30 16l-7.369-7.369-2.211 2.212L25.58 16Zm-8.84-10.314L9.369 8.631 2 16l7.369 7.369 2.211-2.211L6.42 16Zm5.831-3.166 1.6.437-4.42 16.209-1.6-.437z"}]],toml:[['path',{fill:"#7f7f7f",d:"M22.76 6.83v3.25h-5v15.09h-3.5V10.08h-5V6.83Z"}],['path',{fill:"#bfbfbf",d:"M2 2h6.2v3.09H5.34v21.8H8.2V30H2Zm28 28h-6.2v-3.09h2.86V5.11H23.8V2H30Z"}]],dotenv:[['path',{fill:"#ecd53f",rule:'nonzero',d:"M30 2v28H2V2zM14.76 20.54H9.98v6.44h4.9v-1.09h-3.6v-1.75h3.23v-1.08h-3.23v-1.43h3.48zm2.5 0h-1.27v6.44h1.21v-4.2l2.6 4.2h1.3v-6.44h-1.2v4.3zm5.97 0h-1.41l2.3 6.44h1.39l2.3-6.44h-1.37l-1.58 4.76zM8.3 24.96H6.34v1.96H8.3z"}]],git:[['path',{fill:"#dd4c35",d:"M29.472 14.753 17.247 2.528a1.8 1.8 0 0 0-2.55 0l-2.539 2.539 3.22 3.22a2.141 2.141 0 0 1 2.712 2.73l3.1 3.1a2.143 2.143 0 1 1-1.285 1.21l-2.895-2.895v7.617a2.141 2.141 0 1 1-1.764-.062V12.3a2.146 2.146 0 0 1-1.165-2.814l-3.17-3.172L2.528 14.7a1.8 1.8 0 0 0 0 2.551l12.225 12.221a1.8 1.8 0 0 0 2.55 0L29.472 17.3a1.8 1.8 0 0 0 0-2.551"}],['path',{fill:"#fff",d:"m12.158 5.067 3.22 3.22a2.141 2.141 0 0 1 2.712 2.73l3.1 3.1a2.143 2.143 0 1 1-1.285 1.21l-2.895-2.895v7.617a2.141 2.141 0 1 1-1.764-.062V12.3a2.146 2.146 0 0 1-1.165-2.814l-3.17-3.172"}]],docker:[['path',{fill:"#3a4e55",d:"M18.191 13.071H20.7v2.566h1.27a5.5 5.5 0 0 0 1.744-.292 4.5 4.5 0 0 0 .848-.383 3.15 3.15 0 0 1-.589-1.623 3.43 3.43 0 0 1 .616-2.416l.264-.305.314.253a4 4 0 0 1 1.575 2.538 3.84 3.84 0 0 1 2.913.271l.345.2-.181.354a3.63 3.63 0 0 1-3.648 1.74c-2.173 5.413-6.9 7.976-12.642 7.976A7.96 7.96 0 0 1 6.3 20.211l-.025-.043-.226-.459a7.3 7.3 0 0 1-.579-3.693l.035-.38h2.143v-2.565h2.51v-2.51h5.02v-2.51h3.012v5.02Z"}],['path',{fill:"#00aada",d:"M26.324 14.021a3.31 3.31 0 0 0-1.418-2.821 3.07 3.07 0 0 0 .289 3.821 5.28 5.28 0 0 1-3.225 1.037H5.883a6.8 6.8 0 0 0 .667 3.737l.183.335a6 6 0 0 0 .379.569q.992.064 1.829.045a9 9 0 0 0 2.669-.389.193.193 0 1 1 .126.365q-.135.047-.281.088a8.4 8.4 0 0 1-1.845.3c.044 0-.046.007-.046.007l-.082.007a22 22 0 0 1-2.008-.006l-.01.007a7.88 7.88 0 0 0 6.063 2.41c5.56 0 10.276-2.465 12.365-8 1.482.152 2.906-.226 3.553-1.49a3.5 3.5 0 0 0-3.122-.022"}],['path',{fill:"#27b9ec",d:"M26.324 14.021a3.31 3.31 0 0 0-1.418-2.821 3.07 3.07 0 0 0 .289 3.821 5.28 5.28 0 0 1-3.225 1.037H6.836a5.22 5.22 0 0 0 2.106 4.686 9 9 0 0 0 2.669-.389.193.193 0 1 1 .126.365q-.135.047-.281.088a9 9 0 0 1-1.894.314l-.019-.022c1.892.971 4.636.967 7.782-.241a21.87 21.87 0 0 0 9.1-6.889l-.1.048"}],['path',{fill:"#088cb9",d:"M5.913 17.732a6.4 6.4 0 0 0 .637 2.061l.183.335a6 6 0 0 0 .379.569q.992.064 1.829.045a9 9 0 0 0 2.669-.389.193.193 0 1 1 .126.365q-.135.047-.281.088a8.8 8.8 0 0 1-1.891.307h-.1q-.438.025-.922.026c-.351 0-.709-.007-1.1-.026a7.9 7.9 0 0 0 6.076 2.413c4.76 0 8.9-1.807 11.3-5.8Z"}],['path',{fill:"#039cc7",d:"M6.98 17.732a4.83 4.83 0 0 0 1.961 3.01 9 9 0 0 0 2.669-.389.193.193 0 1 1 .126.365q-.135.047-.281.088a9 9 0 0 1-1.9.307c1.892.971 4.628.957 7.773-.252a20.6 20.6 0 0 0 5.377-3.13Z"}],['path',{fill:"#00acd3",d:"M9.889 13.671h.172v1.813h-.172zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813H9.23v-1.813Zm-.33 0h.179v1.813H8.9v-1.813Zm-.33 0h.179v1.813H8.57zm-.323 0h.172v1.813h-.17v-1.813Zm-.181-.181h2.175v2.176H8.066V13.49Zm4.335-2.329h.172v1.813H12.4zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.33 0h.178v1.813h-.178zm-.323 0h.172v1.813h-.172zm-.181-.181h2.176v2.176h-2.175z"}],['path',{fill:"#26c2ee",d:"M12.4 13.671h.172v1.813H12.4zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.33 0h.178v1.813h-.178zm-.323 0h.172v1.813h-.172zm-.181-.181h2.176v2.176h-2.175z"}],['path',{fill:"#00acd3",d:"M14.909 13.671h.172v1.813h-.172zm-.33 0h.179v1.813h-.178zm-.33 0h.179v1.813h-.178zm-.33 0h.181v1.813h-.179v-1.813Zm-.33 0h.179v1.813h-.179zm-.323 0h.172v1.813h-.172zm-.181-.181h2.176v2.176h-2.174V13.49Z"}],['path',{fill:"#26c2ee",d:"M14.909 11.161h.172v1.813h-.172zm-.33 0h.179v1.813h-.178zm-.33 0h.179v1.813h-.178zm-.33 0h.181v1.813h-.179v-1.813Zm-.33 0h.179v1.813h-.179zm-.323 0h.172v1.813h-.172zm-.181-.181h2.176v2.176h-2.174v-2.177Zm4.335 2.691h.172v1.813h-.172zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813H16.1zm-.323 0h.172v1.813h-.172zm-.177-.181h2.176v2.176H15.6z"}],['path',{fill:"#00acd3",d:"M17.42 11.161h.172v1.813h-.172zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813H16.1zm-.323 0h.172v1.813h-.172zm-.181-.181h2.176v2.176H15.6v-2.177Z"}],['path',{fill:"#26c2ee",d:"M17.42 8.65h.172v1.813h-.172zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813H16.1zm-.323 0h.172v1.813h-.172zm-.177-.181h2.176v2.176H15.6z"}],['path',{fill:"#00acd3",d:"M19.93 13.671h.17v1.813h-.17zm-.33 0h.178v1.813H19.6zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.33 0h.179v1.813h-.179zm-.323 0h.172v1.813h-.172zm-.181-.181h2.176v2.176h-2.175z"}],['path',{fill:"#d5eef2",d:"M12.616 19.193a.6.6 0 1 1-.6.6.6.6 0 0 1 .6-.6"}],['path',{fill:"#3a4e55",d:"M12.616 19.363a.4.4 0 0 1 .156.029.175.175 0 1 0 .241.236.43.43 0 1 1-.4-.265M2 17.949h27.92c-.608-.154-1.923-.362-1.707-1.159-1.105 1.279-3.771.9-4.444.267-.749 1.087-5.111.674-5.415-.173-.939 1.1-3.85 1.1-4.789 0-.3.847-4.666 1.26-5.415.173-.673.631-3.338 1.012-4.444-.267.217.8-1.1 1.005-1.707 1.159"}],['path',{fill:"#c0dbe1",d:"M14.211 23.518a5.3 5.3 0 0 1-2.756-2.711 9.2 9.2 0 0 1-1.987.3q-.436.024-.917.025-.554 0-1.168-.033a7.94 7.94 0 0 0 6.145 2.43q.344 0 .683-.013"}],['path',{fill:"#d5eef2",d:"M12.007 21.773a5.2 5.2 0 0 1-.552-.966 9.2 9.2 0 0 1-1.987.3 6.3 6.3 0 0 0 2.539.664"}]],java:[['path',{fill:"#5382a1",d:"M12.7 23.56s-1.07.622.761.833a16 16 0 0 0 5.8-.246 10 10 0 0 0 1.539.753c-5.481 2.349-12.405-.136-8.1-1.339m-.674-3.067s-1.2.888.633 1.078a22.6 22.6 0 0 0 7.481-.359 3.3 3.3 0 0 0 1.152.7c-6.627 1.938-14.009.153-9.266-1.421"}],['path',{fill:"#e76f00",d:"M17.673 15.294a2.05 2.05 0 0 1-.355 2.954s3.429-1.77 1.854-3.987c-1.471-2.067-2.6-3.095 3.508-6.636 0 0-9.586 2.394-5.007 7.669"}],['path',{fill:"#5382a1",d:"M24.922 25.827s.792.652-.872 1.157c-3.164.958-13.168 1.248-15.948.038-1-.435.874-1.038 1.464-1.164a3.8 3.8 0 0 1 .966-.108c-1.111-.783-7.181 1.537-3.083 2.2 11.176 1.812 20.372-.816 17.473-2.124m-11.711-8.508s-5.089 1.209-1.8 1.648a38 38 0 0 0 6.731-.072 53 53 0 0 0 4.221-.555 9 9 0 0 0-1.28.685c-5.17 1.358-15.153.726-12.283-.665a9.6 9.6 0 0 1 4.407-1.042m9.133 5.104c5.253-2.73 2.824-5.353 1.129-5a4 4 0 0 0-.6.161.96.96 0 0 1 .449-.346c3.354-1.179 5.933 3.478-1.083 5.322a.5.5 0 0 0 .106-.138"}],['path',{fill:"#e76f00",d:"M19.172 1.906s2.909 2.91-2.759 7.386c-4.546 3.59-1.037 5.637 0 7.975-2.653-2.394-4.6-4.5-3.294-6.463 1.917-2.879 7.229-4.275 6.056-8.9"}],['path',{fill:"#5382a1",d:"M13.727 29.818c5.042.323 12.786-.179 12.969-2.565 0 0-.353.9-4.167 1.623a41.5 41.5 0 0 1-12.76.2s.645.533 3.959.746"}]],c:[['path',{fill:"#005f91",d:"M10.676 15.973a10.05 10.05 0 0 0 1.175 5.151 5.446 5.446 0 0 0 6.306 2.408 4.28 4.28 0 0 0 3.09-3.6l.109-.61c1.737.251 4.537.658 6.274.906l-.11.44a11.26 11.26 0 0 1-2.7 5.39 9.44 9.44 0 0 1-5.366 2.688 14.6 14.6 0 0 1-8.277-.819 10.15 10.15 0 0 1-5.777-6.24 16.23 16.23 0 0 1 .019-11.45 10.54 10.54 0 0 1 8.963-7.054 13.35 13.35 0 0 1 6.666.555 9.57 9.57 0 0 1 6.167 6.9c.094.352.114.417.114.417-1.932.351-4.319.8-6.238 1.215-.362-1.915-1.265-3.428-3.2-3.9a5.263 5.263 0 0 0-6.616 3.57 10.5 10.5 0 0 0-.385 1.439 12.3 12.3 0 0 0-.214 2.594"}]],cheader:[['path',{fill:"#005f91",d:"M6.97 29V3h5.2v8.52c1.45-1.73 3.61-2.6 6.21-2.6 2.17 0 4.05.72 5.2 2.17 1.01 1.3 1.45 3.18 1.45 6.07V29h-5.2V18.02q0-2.38-.87-3.46c-.58-.73-1.59-1.02-2.74-1.02-1.3 0-2.46.44-3.18 1.3-.58.73-.87 2.03-.87 3.76V29Z"}]],cpp:[['path',{fill:"#984c93",d:"M14.742 24.047a10.24 10.24 0 0 1-4.673.919 7.63 7.63 0 0 1-5.914-2.346A8.88 8.88 0 0 1 2 16.369a9.48 9.48 0 0 1 2.422-6.748 8.22 8.22 0 0 1 6.285-2.588 11.2 11.2 0 0 1 4.035.641v3.761A6.84 6.84 0 0 0 11 10.395a4.81 4.81 0 0 0-3.712 1.535 5.9 5.9 0 0 0-1.413 4.159A5.8 5.8 0 0 0 7.209 20.1a4.57 4.57 0 0 0 3.59 1.493 7.3 7.3 0 0 0 3.943-1.113Zm2.37-9.218v-2.344h2.344v2.344H21.8v2.343h-2.344v2.343h-2.344v-2.343H14.77v-2.344zm8.201 0v-2.344h2.344v2.344H30v2.343h-2.343v2.343h-2.344v-2.343h-2.342v-2.344z"}]],php:[['path',{fill:"#fff",d:"m18.725 18.2.667-3.434a1.75 1.75 0 0 0-.372-1.719 2.93 2.93 0 0 0-2-.525h-1.153l.331-1.7a.22.22 0 0 0-.215-.26h-1.6a.22.22 0 0 0-.215.177l-.709 3.646a2.05 2.05 0 0 0-.477-1.054 2.78 2.78 0 0 0-2.2-.807H7.7a.22.22 0 0 0-.215.177l-1.434 7.38a.22.22 0 0 0 .215.26h1.603a.22.22 0 0 0 .215-.177l.347-1.785h1.2a5.2 5.2 0 0 0 1.568-.2 3.1 3.1 0 0 0 1.15-.689 3.5 3.5 0 0 0 .68-.844l-.287 1.475a.22.22 0 0 0 .215.26h1.6a.22.22 0 0 0 .215-.177l.787-4.051h1.094c.466 0 .6.093.64.133s.1.165.025.569l-.635 3.265a.22.22 0 0 0 .215.26h1.62a.22.22 0 0 0 .207-.18m-7.395-2.834a1.75 1.75 0 0 1-.561 1.092 2.17 2.17 0 0 1-1.315.321h-.712l.515-2.651h.921c.677 0 .949.145 1.059.266a1.18 1.18 0 0 1 .093.972m14.216-2.034a2.78 2.78 0 0 0-2.2-.807h-3.091a.22.22 0 0 0-.215.177l-1.434 7.38a.22.22 0 0 0 .215.26h1.608a.22.22 0 0 0 .215-.177l.347-1.785h1.2a5.2 5.2 0 0 0 1.568-.2 3.1 3.1 0 0 0 1.15-.689 3.43 3.43 0 0 0 1.076-1.927 2.51 2.51 0 0 0-.439-2.232m-1.667 2.034a1.75 1.75 0 0 1-.561 1.092 2.17 2.17 0 0 1-1.318.32h-.71l.515-2.651h.921c.677 0 .949.145 1.059.266a1.18 1.18 0 0 1 .094.973"}],['path',{fill:"#000004",d:"M10.178 13.908a1.65 1.65 0 0 1 1.221.338 1.34 1.34 0 0 1 .145 1.161 1.95 1.95 0 0 1-.642 1.223 2.36 2.36 0 0 1-1.448.37h-.978l.6-3.089Zm-3.917 6.216h1.608l.381-1.962h1.377a5 5 0 0 0 1.5-.191 2.84 2.84 0 0 0 1.07-.642 3.2 3.2 0 0 0 1.01-1.808 2.3 2.3 0 0 0-.385-2.044 2.57 2.57 0 0 0-2.035-.732H7.7Zm8.126-9.342h1.6l-.387 1.962h1.421a2.77 2.77 0 0 1 1.85.468 1.55 1.55 0 0 1 .305 1.516l-.667 3.434H16.89l.635-3.265a.89.89 0 0 0-.08-.76 1.12 1.12 0 0 0-.8-.2H15.37l-.822 4.228h-1.6Zm8.34 3.126a1.65 1.65 0 0 1 1.221.338 1.34 1.34 0 0 1 .145 1.161 1.95 1.95 0 0 1-.642 1.223A2.36 2.36 0 0 1 22 17h-.978l.6-3.089Zm-3.917 6.216h1.608l.381-1.962h1.377a5 5 0 0 0 1.5-.191 2.84 2.84 0 0 0 1.07-.642 3.2 3.2 0 0 0 1.01-1.808 2.3 2.3 0 0 0-.385-2.044 2.57 2.57 0 0 0-2.035-.732h-3.092Z"}],['ellipse',{cx:'16',cy:'16',fill:"#fff",rx:'14',ry:'7.365'}],['ellipse',{cx:'16',cy:'16',fill:"#6280b6",rx:'13.453',ry:'6.818'}]],ruby:[['path',{fill:"#fb7655",d:"M23.693 20.469 7.707 29.961l20.7-1.4L30 7.685Z"}],['path',{fill:"#871101",d:"m28.44 28.542-1.779-12.279-4.846 6.4Z"}],['path',{fill:"#fff",d:"M28.464 28.542 15.43 27.519l-7.654 2.415Z"}],['path',{fill:"#808080",d:"M7.794 29.937 11.05 19.27 3.885 20.8Z"}],['path',{fill:"#fff",d:"m21.813 22.7-3-11.735L10.243 19Z"}],['path',{fill:"#fff",d:"m29.32 11.127-8.1-6.619-2.257 7.3Z"}],['path',{fill:"#fff",d:"m25.53 2.148-4.767 2.634-3.007-2.67Z"}],['path',{fill:"#fff",d:"m2 24.38 2-3.642L2.382 16.4Z"}],['path',{fill:"#fff",d:"m2.274 16.263 1.626 4.61 7.062-1.584 8.062-7.489L21.3 4.569l-3.583-2.53-6.091 2.28C9.706 6.1 5.982 9.635 5.848 9.7s-2.459 4.464-3.574 6.562Z"}],['path',{fill:"#bd0012",d:"M7.981 7.981C12.14 3.858 17.5 1.421 19.559 3.5s-.124 7.121-4.283 11.244-9.455 6.69-11.511 4.614.057-7.258 4.216-11.377"}],['path',{fill:"#8c0c01",d:"m7.794 29.933 3.231-10.7 10.729 3.447c-3.879 3.638-8.194 6.713-13.96 7.254Z"}],['path',{fill:"#7e110b",d:"m19.038 11.774 2.754 10.91c3.24-3.407 6.149-7.07 7.573-11.6z"}],['path',{fill:"#79130d",d:"M29.337 11.139c1.1-3.327 1.357-8.1-3.841-8.985l-4.265 2.355z"}],['path',{fill:"#9e1209",d:"M2 24.332c.153 5.49 4.114 5.572 5.8 5.62l-3.9-9.1z"}],['path',{fill:"#a80d00",d:"M19.053 11.791c2.49 1.531 7.509 4.6 7.61 4.661a17.6 17.6 0 0 0 2.619-5.343z"}],['path',{fill:"#a30c00",d:"m11.021 19.232 4.319 8.332a28 28 0 0 0 6.385-4.88l-10.7-3.452Z"}],['path',{fill:"#8b2114",d:"m3.887 20.861-.612 7.287c1.155 1.577 2.743 1.714 4.409 1.591-1.205-3-3.614-9-3.8-8.878Z"}],['path',{fill:"#b31000",d:"m21.206 4.528 8.58 1.2c-.458-1.94-1.864-3.192-4.261-3.584l-4.319 2.38Z"}]],swift:[['path',{fill:"#f88535",d:"M19.422 4.007s6.217 3.554 7.844 9.2c1.466 5.1.292 7.534.292 7.534a8.9 8.9 0 0 1 1.742 2.8 4.83 4.83 0 0 1 .29 4.453s-.1-2.08-3.2-2.511c-2.841-.4-3.874 2.366-9.3 2.232A18.43 18.43 0 0 1 2 19.354C4.651 20.8 8.124 23.045 12.449 22.7s5.228-1.674 5.228-1.674A67 67 0 0 1 4.891 7.643c3.4 2.845 11.822 8.507 11.626 8.363A76 76 0 0 1 8.092 6.24s12.636 10.389 13.653 10.323c.418-.861 2.579-5.318-2.324-12.557Z"}]],pdf:[['path',{stroke:"#000",d:"M9.064 3.162h11.6a31.5 31.5 0 0 1 7.524 7.538v17.842H9.064Z",transform:"translate(.03 .3)"}],['path',{fill:"#fff",d:"M9.064 3.162h11.6a31.5 31.5 0 0 1 7.524 7.538v17.842H9.064Z"}],['path',{stroke:"#c8c8c8",d:"M9.064 3.162h11.6a31.5 31.5 0 0 1 7.524 7.538v17.842H9.064Z"}],['path',{fill:"#fff",d:"M20.662 3.162a31.8 31.8 0 0 1 7.526 7.538 6.77 6.77 0 0 0-5.332-2.03 6.03 6.03 0 0 0-2.194-5.508"}],['path',{stroke:"#c8c8c8",d:"M20.662 3.162a31.8 31.8 0 0 1 7.526 7.538 6.77 6.77 0 0 0-5.332-2.03 6.03 6.03 0 0 0-2.194-5.508Z"}],['path',{stroke:"#c8c8c8",d:"M5.339 6.496h14.1v2.7h-14.1z"}],['path',{fill:"#f91d0a",d:"M15.819 19.855c.466-.914 1-1.943 1.42-2.977l.168-.408c-.554-2.108-.886-3.8-.589-4.894a.755.755 0 0 1 .763-.458h.254c.484-.007.711.608.737.847a4 4 0 0 1-.141 1.072 2.6 2.6 0 0 0-.161-1.091c-.2-.439-.391-.7-.562-.743a.54.54 0 0 0-.2.407 6 6 0 0 0-.077.939 10.5 10.5 0 0 0 .433 2.729q.08-.235.14-.447c.059-.222.433-1.691.433-1.691s-.094 1.956-.226 2.547q-.042.187-.092.375a8.6 8.6 0 0 0 2.145 3.351 6.7 6.7 0 0 0 1.24.852 17 17 0 0 1 2.517-.189 3.15 3.15 0 0 1 1.938.433.74.74 0 0 1 .213.484 1.5 1.5 0 0 1-.041.282c.01-.051.01-.3-.755-.546a8.9 8.9 0 0 0-3.086-.043c1.566.766 3.093 1.147 3.576.919a1 1 0 0 0 .262-.254 2.7 2.7 0 0 1-.146.484.76.76 0 0 1-.377.258c-.764.2-2.752-.268-4.485-1.258a36.6 36.6 0 0 0-5.768 1.371c-1.675 2.936-2.935 4.284-3.959 3.771l-.377-.189a.44.44 0 0 1-.141-.474c.119-.584.852-1.465 2.324-2.344.158-.1.864-.469.864-.469s-.523.506-.645.605c-1.175.963-2.042 2.174-2.021 2.644v.041c1-.142 2.495-2.174 4.419-5.939m.61.312a78 78 0 0 1-.926 1.682 24.6 24.6 0 0 1 4.975-1.408 8 8 0 0 1-.637-.485 8.5 8.5 0 0 1-2.1-2.729 23 23 0 0 1-1.317 2.94"}],['path',{fill:"#8a0000",d:"M3.75 4.968h17.264v5.803H3.75z"}],['path',{fill:"#5e0000",d:"M21.343 11.119H3.437V4.62h17.906ZM20.7 5.264H4.081v5.209H20.7Z"}],['path',{fill:"#fff9f9",d:"M8.262 5.819h1.256a1.1 1.1 0 0 1 .859.331 1.34 1.34 0 0 1 .3.937 1.35 1.35 0 0 1-.3.942 1.1 1.1 0 0 1-.859.328h-.5v1.349h-.756zm.757.726v1.086h.419a.42.42 0 0 0 .34-.141.6.6 0 0 0 .12-.4.6.6 0 0 0-.12-.4.42.42 0 0 0-.34-.141h-.419m2.949.031v2.369h.271a.85.85 0 0 0 .708-.3 1.38 1.38 0 0 0 .246-.885 1.38 1.38 0 0 0-.244-.88.86.86 0 0 0-.71-.3h-.271m-.757-.758h.8a2.9 2.9 0 0 1 .989.121 1.3 1.3 0 0 1 .562.427 1.8 1.8 0 0 1 .307.607 2.8 2.8 0 0 1 .1.779 2.8 2.8 0 0 1-.1.786 1.8 1.8 0 0 1-.307.607 1.3 1.3 0 0 1-.566.43 3 3 0 0 1-.991.125h-.8V5.819m3.342 0H16.6v.758h-1.29V7.3h1.209v.758H15.31v1.648h-.757V5.819"}]],zip:[['path',{fill:"#c09553",d:"M27.667 27.667V17.333L23 15V2H4.333v28h23.334Zm-4.667 0v-9.111l2.333 1.222v7.889Z"}],['path',{fill:"#4d4d4d",d:"M17.65 25.559h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M17.65 23.26h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M17.65 20.96h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M17.65 18.66h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M17.65 16.36h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M17.65 14.06h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M17.65 11.76h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M17.65 9.461h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M17.65 7.161h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M16.237 26.721h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M16.237 24.421h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M16.237 22.121h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M16.237 19.821h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M16.237 17.522h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M17.65 27.859h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M16.237 15.222h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M16.237 12.922h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M16.237 10.622h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M16.237 8.322h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M16.237 29.018h3.45v.993h-3.45z"}],['path',{fill:"#808080",d:"M20.1 5.911a.554.554 0 0 0-.548-.53h-.009v.557h.092l.206 2.514h-2.252l.211-2.514h.094v-.557h-.044a.55.55 0 0 0-.547.53l-.314 10.569a.513.513 0 0 0 .515.531h2.432a.51.51 0 0 0 .513-.531Zm-1.384 10.5a1.171 1.171 0 1 1 1.171-1.171 1.17 1.17 0 0 1-1.171 1.168Z"}],['path',{fill:"#808080",d:"M18.096 3.802h1.24v3.054h-1.24z"}],['path',{fill:"#808080",d:"M21.4 4.56a2.55 2.55 0 0 0-2.549-2.549h-.276a2.55 2.55 0 0 0-2.436 3.3v.006a8 8 0 0 1 .261 2.561 1.8 1.8 0 0 0 .641 1.271l.109-3.441a.593.593 0 0 1 .6-.551h.135v-1.57h1.653v1.57h.1a.6.6 0 0 1 .605.551l.121 3.462a1.8 1.8 0 0 0 .666-1.292V7.72a7.7 7.7 0 0 1 .236-2.359 2.5 2.5 0 0 0 .134-.801"}]],npm:[['path',{fill:"#c12127",d:"M2 2h28v28H2"}],['path',{fill:"#fff",d:"M7.25 7.25h17.5v17.5h-3.5v-14H16v14H7.25"}]],node:[['path',{fill:"#83cd29",d:"M16 30a2.15 2.15 0 0 1-1.076-.288L11.5 27.685c-.511-.286-.262-.387-.093-.446a6.8 6.8 0 0 0 1.549-.7.26.26 0 0 1 .255.019l2.631 1.563a.34.34 0 0 0 .318 0l10.26-5.922a.32.32 0 0 0 .157-.278V10.075a.33.33 0 0 0-.159-.283l-10.26-5.917a.32.32 0 0 0-.317 0L5.587 9.794a.33.33 0 0 0-.162.281v11.841a.32.32 0 0 0 .161.274L8.4 23.814c1.525.762 2.459-.136 2.459-1.038V11.085a.3.3 0 0 1 .3-.3h1.3a.3.3 0 0 1 .3.3v11.692c0 2.035-1.108 3.2-3.038 3.2a4.4 4.4 0 0 1-2.363-.642l-2.697-1.547a2.17 2.17 0 0 1-1.076-1.872V10.075A2.16 2.16 0 0 1 4.661 8.2l10.261-5.924a2.25 2.25 0 0 1 2.156 0L27.338 8.2a2.17 2.17 0 0 1 1.077 1.87v11.846a2.17 2.17 0 0 1-1.077 1.872l-10.26 5.924A2.15 2.15 0 0 1 16 30"}],['path',{fill:"#83cd29",d:"M14.054 17.953a.3.3 0 0 1 .3-.3h1.327a.3.3 0 0 1 .295.251c.2 1.351.8 2.032 3.513 2.032 2.161 0 3.082-.489 3.082-1.636 0-.661-.261-1.152-3.62-1.481-2.808-.278-4.544-.9-4.544-3.144 0-2.07 1.745-3.305 4.67-3.305 3.287 0 4.914 1.141 5.12 3.589a.3.3 0 0 1-.295.323h-1.336a.3.3 0 0 1-.288-.232c-.319-1.421-1.1-1.875-3.2-1.875-2.36 0-2.634.822-2.634 1.438 0 .746.324.964 3.51 1.385 3.153.417 4.651 1.007 4.651 3.223 0 2.236-1.864 3.516-5.115 3.516-4.495.006-5.436-2.055-5.436-3.784"}]],eslint:[['path',{fill:"#4b32c3",d:"m29.832 16.7-6.354 10.717A1.26 1.26 0 0 1 22.36 28H9.647a1.26 1.26 0 0 1-1.118-.59l-6.356-10.7a1.26 1.26 0 0 1 0-1.272L8.527 4.676A1.34 1.34 0 0 1 9.647 4h12.709a1.34 1.34 0 0 1 1.118.678l6.354 10.786a1.2 1.2 0 0 1 0 1.238Zm-5.262 4.2v-9.614L16 6.466l-8.56 4.82V20.9L16 25.719Z"}],['path',{fill:"#8080f2",d:"m21.802 19.188-5.747 3.235-5.742-3.235v-6.47l5.742-3.236 5.747 3.236z"}]],prettier:[['path',{stroke:"#56b3b4",d:"M2.45 2.45h16.3M2.45 7.87h9.48m10.8 0h1.35m-16.3 2.71h1.35M13.19 16h10.8m-21.7 2.71h5.42m-5.42 8.13H5"}],['path',{stroke:"#ea5e5e",d:"M2.45 5.16h4.06m12.2 5.42h6.77M2.48 16h1.35m6.77 2.71h5.42m-13.5 10.8h6.77"}],['path',{stroke:"#f7b93e",d:"M9.23 5.16h13.5m-20.3 5.42h2.71m13.5 2.71h6.77M6.41 16h4.06m-4.06 5.42h12.2m-10.8 5.42h1.35"}],['path',{stroke:"#bf85bf",d:"M14.6 7.87h5.42m-17.6 5.42h6.77m9.48 5.42h4.06m-20.3 2.71h1.35m-1.35 2.71H9.2"}],['path',{stroke:"#4d616e",d:"M21.4 2.45h8.13m-4.06 2.71h4.06m-2.71 2.71h2.71m-17.6 2.71h4.06m12.2 0h1.35m-17.6 2.71H16m12.2 0h1.35M26.84 16h2.71m-4.06 2.71h4.06m-8.13 2.71h2.71m2.71 0h2.71m-17.6 2.71h2.71m2.71 0h12.2m-17.6 2.71h5.42m2.71 0h1.35m2.71 0h5.42m-17.6 2.71h8.13m2.71 0h6.77"}]],pnpm:[['path',{fill:"#f9ad00",d:"M30 10.75h-8.749V2H30Zm-9.626 0h-8.75V2h8.75Zm-9.625 0H2V2h8.749ZM30 20.375h-8.749v-8.75H30Z"}],['path',{fill:"#fff",d:"M20.374 20.375h-8.75v-8.75h8.75Zm0 9.625h-8.75v-8.75h8.75ZM30 30h-8.749v-8.75H30Zm-19.251 0H2v-8.75h8.749Z"}]],yarn:[['path',{fill:"#2188b6",d:"M28.208 24.409a10.5 10.5 0 0 0-3.959 1.822 23.7 23.7 0 0 1-5.835 2.642 1.63 1.63 0 0 1-.983.55 62 62 0 0 1-6.447.577c-1.163.009-1.876-.3-2.074-.776a1.573 1.573 0 0 1 .866-2.074 4 4 0 0 1-.514-.379c-.171-.171-.352-.514-.406-.388-.225.55-.343 1.894-.947 2.5-.83.839-2.4.559-3.328.072-1.019-.541.072-1.813.072-1.813a.73.73 0 0 1-.992-.343 4.85 4.85 0 0 1-.667-2.949 5.37 5.37 0 0 1 1.749-2.895 9.3 9.3 0 0 1 .658-4.4 10.45 10.45 0 0 1 3.165-3.661S6.628 10.747 7.35 8.817c.469-1.262.658-1.253.812-1.308a3.6 3.6 0 0 0 1.452-.857 5.27 5.27 0 0 1 4.41-1.7S15.2 1.4 16.277 2.09a18.4 18.4 0 0 1 1.533 2.886s1.281-.748 1.425-.469a11.33 11.33 0 0 1 .523 6.132 14 14 0 0 1-2.6 5.411c-.135.225 1.551.938 2.615 3.887.983 2.7.108 4.96.262 5.212.027.045.036.063.036.063s1.127.09 3.391-1.308a8.5 8.5 0 0 1 4.277-1.604 1.081 1.081 0 0 1 .469 2.11Z"}]],claude:[['path',{fill:"#d97757",d:"m7.5 20.61 5.5-3.08.1-.27-.1-.15h-.27l-.92-.06a234 234 0 0 1-8.51-.34l-.67-.14-.62-.82.06-.41.56-.38.8.07c3.08.2 6.15.4 9.21.72h.46l.06-.19-.16-.1-.12-.12-2.74-1.86c-2.04-1.3-3.55-2.43-5.38-3.68l-.43-.54-.18-1.18.76-.84 1.03.07.26.07c2.03 1.6 4.1 3.14 6.17 4.66l.43.36.17-.12.02-.09-.2-.32c-1.43-2.6-2.55-4.62-4-6.96l-.2-.72c-.08-.3-.13-.55-.13-.85l.87-1.18.49-.16 1.16.16.49.42c1.4 3.31 2.76 5.93 4.23 8.83l.29.97.1.3h.19v-.17c.65-3.42 0-6.57 1.22-9.53l.87-.57.68.33.56.8-.08.51c-.37 2.62-.92 5.22-1.4 7.82h.24l.29-.29a69 69 0 0 1 4.91-5.94l.64-.5h1.2l.89 1.32-.4 1.36a53.5 53.5 0 0 0-4.66 6.47l.09.13.22-.02c2.4-.57 4.84-.99 7.27-1.4l.97.45.1.46-.37.94c-3 .72-6 1.34-9 2.05l-.05.04.06.07c2.7.26 5.62.3 7.99.47l.92.61.55.75-.1.56-1.4.73c-2.93-.7-5.19-1.22-7.91-1.9h-.22v.13c2.18 2.12 4.6 4.27 6.54 6.07l.15.68-.38.53-.4-.06c-2.04-1.43-3.9-3.09-5.8-4.7h-.15v.2l.52.76c1.14 1.79 2.64 3.25 2.87 5.37l-.2.41-.7.25-.78-.14a73 73 0 0 1-4.58-7.04l-.17.09-.78 8.46-.37.43-.85.33-.71-.54-.38-.87a114 114 0 0 0 1.53-7.97l.2-.73-.01-.05-.16.02a77 77 0 0 1-6.23 7.88l-.48.2-.84-.44.08-.77.47-.69c2.07-2.57 3.54-4.66 5.54-7v-.19h-.07l-7.4 4.8-1.31.17-.57-.53.07-.87.27-.28 2.23-1.53z"}]],default_file:[['path',{fill:"#c5c5c5",d:"M20.414 2H5v28h22V8.586ZM7 28V4h12v6h6v18Z"}]]};

    function iconForPath(path) {
      const base = (path.split('/').pop() ?? '').toLowerCase();
      if (base === 'package.json' || base === 'npm-shrinkwrap.json') return 'npm';
      if (base === 'package-lock.json') return 'json';
      if (base.startsWith('pnpm-lock')) return 'pnpm';
      if (base === 'yarn.lock') return 'yarn';
      if (base === 'dockerfile' || base.endsWith('.dockerfile')) return 'docker';
      if (base.startsWith('readme')) return 'markdown';
      if (base.startsWith('license') || base.startsWith('copying')) return 'text';
      if (base === '.eslintrc' || base.startsWith('.eslintrc') || base.startsWith('eslint.config')) return 'eslint';
      if (base === '.prettierrc' || base.startsWith('.prettierrc') || base.startsWith('prettier.config')) return 'prettier';
      if (base.startsWith('.env')) return 'dotenv';
      if (base === '.gitignore' || base === '.gitattributes' || base === '.gitmodules') return 'git';
      if (base.startsWith('claude.')) return 'claude';
      const dot = base.lastIndexOf('.');
      if (dot <= 0) return 'default_file';
      const ext = base.slice(dot + 1);
      switch (ext) {
        case 'ts': case 'tsx': case 'mts': case 'cts': return 'typescript';
        case 'js': case 'jsx': case 'mjs': case 'cjs': return 'js';
        case 'json': case 'jsonc': case 'json5': case 'webmanifest': return 'json';
        case 'md': case 'markdown': case 'mdx': return 'markdown';
        case 'yaml': case 'yml': return 'yaml';
        case 'py': case 'pyi': case 'python': return 'python';
        case 'go': return 'go';
        case 'rs': return 'rust';
        case 'sh': case 'bash': case 'zsh': return 'shell';
        case 'html': case 'htm': case 'svelte': case 'ejs': return 'html';
        case 'css': return 'css';
        case 'scss': case 'sass': case 'less': return 'sass';
        case 'vue': return 'vue';
        case 'svg': return 'svg';
        case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': case 'ico': case 'bmp': case 'avif': return 'image';
        case 'txt': case 'log': case 'text': return 'text';
        case 'csv': case 'tsv': return 'csv';
        case 'sql': case 'sqlite': case 'db': return 'sql';
        case 'xml': case 'plist': case 'xhtml': return 'xml';
        case 'toml': return 'toml';
        case 'java': case 'class': case 'jar': return 'java';
        case 'c': return 'c';
        case 'h': return 'cheader';
        case 'cc': case 'cpp': case 'cxx': case 'hpp': case 'hh': case 'hxx': return 'cpp';
        case 'php': return 'php';
        case 'rb': case 'ruby': case 'gemspec': return 'ruby';
        case 'swift': return 'swift';
        case 'pdf': return 'pdf';
        case 'zip': case 'gz': case 'tar': case 'tgz': case '7z': case 'rar': return 'zip';
        case 'node': return 'node';
        case 'git': return 'git';
        default: return 'default_file';
      }
    }

    function fileIconGlyph(path, untracked) {
      const name = iconForPath(path);
      const shapes = FILE_ICONS[name] ?? FILE_ICONS.default_file;
      return h('svg', {
        viewBox: '0 0 32 32', className: 'jb-fileicon' + (untracked ? ' jb-fileicon-gray' : ''), 'aria-hidden': true,
      }, shapes.map(([tag, attrs], index) => h(tag, { key: index, ...attrs })));
    }


    // ------------------------------------------------------------- utils
    function fmtDate(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      }
      const sameYear = d.getFullYear() === now.getFullYear();
      return d.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function fmtDateTime(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    async function api(path, options = {}) {
      const response = await fetch(path, { method: options.method ?? 'GET', signal: options.signal });
      let data = null;
      try { data = await response.json(); } catch { /* non-JSON */ }
      if (!response.ok) throw new Error(data && typeof data.error === 'string' ? data.error : `HTTP ${response.status}`);
      return data;
    }

    // ------------------------------------------------------------- icons
    const LU = {
      s: { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      branch: [h('path', { d: 'M15 6a9 9 0 0 0-9 9V3' }), h('circle', { cx: 18, cy: 6, r: 3 }), h('circle', { cx: 6, cy: 18, r: 3 })],
      folder: [h('path', { d: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z' })],
      refresh: [h('path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }), h('path', { d: 'M21 3v5h-5' }), h('path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }), h('path', { d: 'M8 16H3v5' })],
      chevron: [h('path', { d: 'm9 18 6-6-6-6' })],
      search: [h('circle', { cx: 11, cy: 11, r: 7 }), h('path', { d: 'm21 21-4.3-4.3' })],
    };
    const lucideSvg = (paths, size) => h('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, ...LU.s }, paths);
    function branchGlyph(size) { return lucideSvg(LU.branch, size ?? 15); }
    function folderGlyph(size) { return lucideSvg(LU.folder, size ?? 15); }
    function refreshGlyph(size) { return lucideSvg(LU.refresh, size ?? 15); }
    function chevronGlyph(size) { return lucideSvg(LU.chevron, size ?? 12); }
    function searchGlyph(size) { return lucideSvg(LU.search, size ?? 14); }

    // ------------------------------------------------------------- data
    function buildTree(entries) {
      const root = { name: '', children: [], files: [] };
      for (const entry of entries) {
        const parts = entry.path.split('/');
        let node = root;
        for (let i = 0; i < parts.length - 1; i++) {
          let child = node.children.find((c) => c.name === parts[i]);
          if (!child) { child = { name: parts[i], children: [], files: [] }; node.children.push(child); }
          node = child;
        }
        node.files.push(entry);
      }
      const sortNode = (node) => {
        node.children.sort((a, b) => a.name.localeCompare(b.name));
        node.files.sort((a, b) => a.path.localeCompare(b.path));
        for (const child of node.children) sortNode(child);
      };
      sortNode(root);
      return root;
    }

    /** Parse a unified diff into numbered lines (old/new line numbers). */
    function parseDiff(text, untracked) {
      const lines = [];
      if (untracked) {
        const content = text.replace(/\n$/, '');
        const parts = content.split('\n');
        for (let i = 0; i < parts.length; i++) lines.push({ kind: 'add', old: null, new: i + 1, text: parts[i] });
        return lines;
      }
      let oldN = 0;
      let newN = 0;
      for (const raw of text.split('\n')) {
        if (raw.startsWith('@@')) {
          const match = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(raw);
          if (match) { oldN = Number(match[1]); newN = Number(match[3]); }
          lines.push({ kind: 'hunk', old: null, new: null, text: raw });
        } else if (raw.startsWith('+++') || raw.startsWith('---')) {
          lines.push({ kind: 'file', old: null, new: null, text: raw });
        } else if (raw.startsWith('+')) {
          lines.push({ kind: 'add', old: null, new: newN++, text: raw });
        } else if (raw.startsWith('-')) {
          lines.push({ kind: 'del', old: oldN++, new: null, text: raw });
        } else if (raw.startsWith('\\')) {
          lines.push({ kind: 'meta', old: null, new: null, text: raw });
        } else {
          lines.push({ kind: 'ctx', old: oldN++, new: newN++, text: raw });
        }
      }
      return lines;
    }

    /** Lane-based commit graph for the Log tab. */
    function buildGraph(commits) {
      let lanes = [];
      const rows = [];
      for (const commit of commits) {
        const parents = commit.parents ?? [];
        let ci = lanes.indexOf(commit.hash);
        if (ci === -1) ci = lanes.length;
        const next = lanes.slice();
        next[ci] = parents[0] ?? null;
        const merges = [];
        for (let j = 1; j < parents.length; j++) {
          let slot = -1;
          for (let k = ci + 1; k < next.length; k++) if (next[k] === null) { slot = k; break; }
          if (slot === -1) slot = next.length;
          next[slot] = parents[j];
          merges.push(slot);
        }
        while (next.length > 0 && next[next.length - 1] === null) next.pop();
        rows.push({ commit, lane: ci, merges, next });
        lanes = next;
      }
      let maxLanes = 0;
      for (const row of rows) maxLanes = Math.max(maxLanes, row.next.length, row.lane + 1);
      return { rows, maxLanes };
    }

    function graphRowSvg(row, maxLanes, branchName) {
      const LANE_W = 10;
      const PAD = 4;
      const H = 24;
      const R = 3.4;
      const W = maxLanes * LANE_W + PAD * 2;
      const cx = (lane) => PAD + lane * LANE_W + LANE_W / 2;
      const y = H / 2;
      const parts = [];
      for (let j = 0; j < row.next.length; j++) {
        if (row.next[j] !== null) {
          parts.push(h('line', { key: `v${j}`, x1: cx(j), y1: 1, x2: cx(j), y2: H - 1, stroke: GRAPH_COLORS[j % GRAPH_COLORS.length], strokeWidth: 1.5 }));
        }
      }
      for (const m of row.merges) {
        const xm = cx(m);
        const xc = cx(row.lane);
        if (Math.abs(xm - xc) > 0.5) {
          const color = GRAPH_COLORS[m % GRAPH_COLORS.length];
          parts.push(h('path', {
            key: `c${m}`,
            d: `M ${xm} ${y - 7} C ${xm} ${y - 7}, ${xm} ${y + 0.5}, ${xc - R} ${y + 0.5}`,
            stroke: color, strokeWidth: 1.5, fill: 'none',
          }));
        }
      }
      parts.push(h('circle', { key: 'dot', cx: cx(row.lane), cy: y, r: R, fill: GRAPH_COLORS[row.lane % GRAPH_COLORS.length] }));
      return h('div', { className: 'jb-col-graph', style: { position: 'relative' } },
        h('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': true }, parts),
        branchName !== null ? h('span', { className: 'jb-branchchip-log' }, branchName) : null);
    }

    // ------------------------------------------------------------- pieces
    function DiffLines({ lines }) {
      return h('div', { className: 'jb-diffbody' }, lines.map((line, index) =>
        h('div', { key: index, className: `jb-dline jb-dline-${line.kind}` },
          h('span', { className: 'jb-dline-num' }, line.old === null ? '' : String(line.old)),
          h('span', { className: 'jb-dline-num2' }, line.new === null ? '' : String(line.new)),
          h('span', { className: 'jb-dline-text' }, line.text === '' ? '\u00a0' : line.text))));
    }

    function DiffView({ path, tag, stats, diff, t }) {
      if (diff === null) return h('div', { className: 'jb-diffempty' }, t('diff.select'));
      if (diff.binary) return h('div', { className: 'jb-diffempty' }, t('diff.binary'));
      const lines = diff.text === undefined ? [] : parseDiff(diff.text, diff.untracked === true);
      if (lines.length === 0) return h('div', { className: 'jb-diffempty' }, t('diff.empty'));
      return h('div', { className: 'jb-diffwrap' },
        h('div', { className: 'jb-diffhead' },
          h('span', { className: 'jb-diffpath', title: path }, path),
          h('span', { className: 'jb-difftag' }, tag),
          stats !== null ? h('span', { className: 'jb-diffstats' }, `+${stats.ins} −${stats.del}`) : null),
        h(DiffLines, { lines }));
    }

    function ChangeTree({ tree, t, rootLabel, rootCount, selectedPath, onSelect, collapsed, toggle }) {
      const rows = [];
      const fileRow = (entry, depth) => h('div', {
        key: 'f' + entry.path, className: 'jb-node', 'data-selected': selectedPath === entry.path, 'data-status': entry.letter,
        style: { paddingLeft: 6 + depth * 16 }, title: t(entry.key) + ' — ' + entry.displayPath,
        onClick: () => onSelect(entry),
      },
        fileIconGlyph(entry.path, entry.untracked),
        h('span', { className: 'jb-filename', title: entry.displayPath }, entry.displayPath),
        (entry.ins > 0 || entry.del > 0) ? h('span', { className: 'jb-stats' }, `+${entry.ins} −${entry.del}`) : null);
      const renderNode = (node, depth, path) => {
        const key = path + node.name;
        const open = !collapsed.has(key);
        rows.push(h('div', { key: 'd' + key, className: 'jb-node', 'data-open': open, onClick: () => toggle(key), style: { paddingLeft: 6 + depth * 16 } },
          h('span', { className: 'jb-chevron' }, chevronGlyph()),
          h('span', { className: 'jb-folder' }, folderGlyph()),
          h('span', { className: 'jb-dirname' }, node.name)));
        if (open) {
          for (const child of node.children) renderNode(child, depth + 1, key + '/');
          for (const entry of node.files) rows.push(fileRow(entry, depth + 1));
        }
      };
      for (const child of tree.children) renderNode(child, 0, '');
      for (const entry of tree.files) rows.push(fileRow(entry, 1));
      return h('div', null,
        h('div', { className: 'jb-group-title' }, rootLabel, h('span', { className: 'jb-count' }, `(${rootCount})`)),
        rows);
    }

    function CommitDetail({ detail, t }) {
      if (detail === null) return null;
      if (detail.found === false) {
        return h('div', { className: 'jb-logdetail' },
          h('div', { className: 'jb-logdetail-head' }, h('span', { className: 'jb-logdetail-subject' }, t('log.detail'))),
          h('div', { className: 'jb-empty' }, detail.error ?? t('diff.empty')));
      }
      const lines = detail.diff === undefined || detail.diff === '' ? [] : parseDiff(detail.diff, false);
      return h('div', { className: 'jb-logdetail' },
        h('div', { className: 'jb-logdetail-head' },
          h('span', { className: 'jb-logdetail-subject', title: detail.subject }, detail.subject),
          h('span', { className: 'jb-loghash', title: detail.hash }, detail.short)),
        h('div', { className: 'jb-logdetail-meta' },
          `${detail.author}${detail.email ? ` <${detail.email}>` : ''} · ${fmtDateTime(detail.date)}${detail.parents.length > 1 ? ` · ${t('log.parents', { n: String(detail.parents.length) })}` : ''}`),
        detail.files.length > 0
          ? h('div', { className: 'jb-detail-files' },
            h('div', { className: 'jb-detail-fileshead' }, t('log.files', { n: String(detail.files.length) })),
            detail.files.map((file) => h('div', { key: file.path, className: 'jb-dfile', title: file.path },
              h('span', { className: 'jb-dfile-stats' }, `+${file.ins} −${file.del}`),
              h('span', { className: 'jb-dfile-path' }, file.path))))
          : null,
        lines.length > 0 ? h(DiffLines, { lines }) : h('div', { className: 'jb-diffempty' }, t('diff.empty')));
    }

    // ------------------------------------------------------------- panel
    function GitPanel(props) {
      const { useWorkspaces, useSessions, t } = props;
      const workspaces = useWorkspaces((state) => state.items);
      const sessions = useSessions((state) => state.byId ?? {});
      const [overrideId, setOverrideId] = useState(null);
      const sessionRows = useMemo(() => Object.values(sessions), [sessions]);
      const currentSession = useMemo(() => (
        sessionRows.find((s) => (s.retainedBy?.mainView ?? 0) > 0)
        ?? [...sessionRows].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]
        ?? null
      ), [sessionRows]);
      const boundWorkspace = useMemo(() => {
        const cwd = currentSession?.cwd;
        if (cwd === undefined || cwd === null || cwd === '') return null;
        return workspaces.find((w) => w.path === cwd)
          ?? workspaces.find((w) => cwd.startsWith(w.path + '/'))
          ?? null;
      }, [currentSession, workspaces]);
      useEffect(() => { setOverrideId(null); }, [currentSession?.id]);
      const targetWorkspaceId = overrideId ?? boundWorkspace?.workspaceId ?? workspaces[0]?.workspaceId ?? null;
      const workspace = workspaces.find((item) => item.workspaceId === targetWorkspaceId) ?? null;
      const cwd = workspace ? workspace.path : null;

      const [tab, setTab] = useState('changes');
      const [status, setStatus] = useState(null);
      const [statusError, setStatusError] = useState(null);
      const [statusLoading, setStatusLoading] = useState(false);
      const [log, setLog] = useState(null);
      const [logError, setLogError] = useState(null);
      const [filter, setFilter] = useState('');
      const [selected, setSelected] = useState(null);
      const [diff, setDiff] = useState(null);
      const [diffLoading, setDiffLoading] = useState(false);
      const [logSelected, setLogSelected] = useState(null);
      const [detail, setDetail] = useState(null);
      const [detailLoading, setDetailLoading] = useState(false);
      const [collapsed, setCollapsed] = useState(() => new Set());
      const abortRef = useRef(null);

      const toggleCollapse = useCallback((key) => {
        setCollapsed((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key); else next.add(key);
          return next;
        });
      }, []);

      const reload = useCallback(async (opts = {}) => {
        if (cwd === null) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setStatusLoading(true);
        setStatusError(null);
        try {
          const data = await api(`/api/git.status?cwd=${encodeURIComponent(cwd)}`, { signal: controller.signal });
          setStatus(data);
          setSelected(null);
          setDiff(null);
          if (opts.loadLog !== false) {
            try {
              const logData = await api(`/api/git.log?cwd=${encodeURIComponent(cwd)}&limit=60`, { signal: controller.signal });
              setLog(logData.commits ?? []);
              setLogError(null);
            } catch (error) {
              if (error.name !== 'AbortError') setLogError(error.message);
            }
          }
        } catch (error) {
          if (error.name !== 'AbortError') setStatusError(error.message);
        } finally {
          if (controller.signal.aborted === false) setStatusLoading(false);
        }
      }, [cwd]);

      useEffect(() => {
        setStatus(null);
        setLog(null);
        setDiff(null);
        setSelected(null);
        setDetail(null);
        setLogSelected(null);
        if (cwd !== null) reload();
      }, [cwd, reload]);

      useEffect(() => () => abortRef.current?.abort(), []);

      const loadDiff = useCallback(async (entry) => {
        if (cwd === null) return;
        setSelected(entry);
        setDiff(null);
        setDiffLoading(true);
        try {
          const params = new URLSearchParams({ cwd });
          params.set('path', entry.path);
          if (entry.untracked) params.set('untracked', '1');
          else if (entry.staged && entry.unstagedToo) params.set('both', '1');
          else if (entry.staged) params.set('staged', '1');
          const data = await api(`/api/git.diff?${params.toString()}`);
          setDiff(data);
        } catch (error) {
          setDiff({ error: error.message });
        } finally {
          setDiffLoading(false);
        }
      }, [cwd]);

      const loadCommit = useCallback(async (hash) => {
        if (cwd === null) return;
        setLogSelected(hash);
        setDetail(null);
        setDetailLoading(true);
        try {
          const data = await api(`/api/git.commit?cwd=${encodeURIComponent(cwd)}&hash=${encodeURIComponent(hash)}`);
          setDetail(data);
        } catch (error) {
          setDetail({ found: false, error: error.message });
        } finally {
          setDetailLoading(false);
        }
      }, [cwd]);

      const query = filter.trim().toLowerCase();
      const filtered = (status?.changes ?? []).filter((entry) =>
        query === '' || entry.path.toLowerCase().includes(query) || entry.displayPath.toLowerCase().includes(query));
      const staged = filtered.filter((entry) => entry.staged);
      const unstaged = filtered.filter((entry) => !entry.staged && !entry.untracked);
      const untracked = filtered.filter((entry) => entry.untracked);
      const treeStaged = useMemo(() => buildTree(staged), [staged]);
      const treeUnstaged = useMemo(() => buildTree(unstaged), [unstaged]);
      const treeUntracked = useMemo(() => buildTree(untracked), [untracked]);

      const toolbar = h('div', { className: 'jb-toolbar' },
        workspaces.length > 0
          ? h('span', { className: 'jb-selectwrap' },
            h('span', { className: 'jb-tool-icon', style: { color: C.textDim } }, folderGlyph()),
            h('select', {
              className: 'jb-select', value: targetWorkspaceId ?? '', disabled: statusLoading,
              onChange: (event) => setOverrideId(event.target.value),
              title: t('repo.select'),
            }, workspaces.map((item) => h('option', { key: item.workspaceId, value: item.workspaceId },
              item.title === item.path ? item.title : `${item.title} — ${item.path}`))))
          : null,
        status?.isRepo
          ? h('span', { className: 'jb-branchinfo' },
            h('span', { className: 'jb-branchchip' }, branchGlyph(13), status.branch ?? t('repo.detached')),
            status.head ? h('span', { className: 'jb-headchip' }, status.head) : null,
            (status.ahead > 0 || status.behind > 0)
              ? h('span', { className: 'jb-headchip' }, t('repo.ahead', { ahead: String(status.ahead), behind: String(status.behind) }))
              : null)
          : null,
        h('span', { className: 'jb-spacer' }),
        h('button', { type: 'button', className: 'jb-tb-btn', title: t('panel'), disabled: statusLoading || cwd === null, onClick: () => reload() }, refreshGlyph()));

      const tabs = h('div', { className: 'jb-tabs' },
        h('button', { type: 'button', className: 'jb-tab', 'data-active': tab === 'changes', onClick: () => setTab('changes') }, t('tabs.changes')),
        h('button', { type: 'button', className: 'jb-tab', 'data-active': tab === 'log', onClick: () => setTab('log') }, t('tabs.log')));

      let content;
      if (status === null && statusLoading) {
        content = h('div', { className: 'jb-empty' }, t('loading'));
      } else if (statusError !== null) {
        content = h('div', { className: 'jb-empty' }, t('error.load', { message: statusError }));
      } else if (status === null || !status.isRepo) {
        content = h('div', { className: 'jb-empty' }, t('repo.notGit'));
      } else if (tab === 'changes') {
        const selectedEntry = selected;
        const diffTag = selectedEntry === null ? '' : t(selectedEntry.untracked ? 'diff.untracked' : selectedEntry.staged && selectedEntry.unstagedToo ? 'diff.both' : selectedEntry.staged ? 'diff.staged' : 'diff.unstaged');
        content = h('div', { className: 'jb-changes' },
          h('div', { className: 'jb-tree' },
            h('div', { className: 'jb-filter' },
              searchGlyph(),
              h('input', { type: 'search', value: filter, placeholder: t('filter.placeholder'), onChange: (event) => setFilter(event.target.value) })),
            staged.length > 0
              ? h(ChangeTree, { tree: treeStaged, t, rootLabel: t('group.staged'), rootCount: staged.length, selectedPath: selectedEntry?.path, onSelect: loadDiff, collapsed, toggle: toggleCollapse })
              : null,
            unstaged.length > 0
              ? h(ChangeTree, { tree: treeUnstaged, t, rootLabel: t('group.changes'), rootCount: unstaged.length, selectedPath: selectedEntry?.path, onSelect: loadDiff, collapsed, toggle: toggleCollapse })
              : null,
            untracked.length > 0
              ? h(ChangeTree, { tree: treeUntracked, t, rootLabel: t('group.unversioned'), rootCount: untracked.length, selectedPath: selectedEntry?.path, onSelect: loadDiff, collapsed, toggle: toggleCollapse })
              : null,
            status.total > status.shown
              ? h('div', { className: 'jb-tree-hint' }, t('changes.limited', { shown: String(status.shown), total: String(status.total) }))
              : null),
          h('div', { className: 'jb-detail' },
            diffLoading
              ? h('div', { className: 'jb-diffempty' }, t('loading'))
              : diff !== null && diff.error !== undefined
                ? h('div', { className: 'jb-diffempty' }, t('error.load', { message: diff.error }))
                : h(DiffView, {
                  path: selectedEntry?.displayPath ?? '', tag: diffTag,
                  stats: selectedEntry && !selectedEntry.untracked ? { ins: selectedEntry.ins, del: selectedEntry.del } : null,
                  diff, t,
                })));
      } else {
        const graph = log === null ? null : buildGraph(log);
        content = h('div', { className: 'jb-log' },
          logError !== null
            ? h('div', { className: 'jb-notice jb-notice-error' }, logError)
            : null,
          h('div', { className: 'jb-loghead' },
            h('span', { className: 'jb-col-graph' }, ''),
            h('span', { className: 'jb-col-msg' }, 'Message'),
            h('span', { className: 'jb-col-author' }, 'Author'),
            h('span', { className: 'jb-col-date' }, 'Date'),
            h('span', { className: 'jb-col-hash' }, 'Hash')),
          log === null
            ? h('div', { className: 'jb-empty' }, t('loading'))
            : log.length === 0
              ? h('div', { className: 'jb-empty' }, t('log.empty'))
              : h('div', { className: 'jb-logbody' }, graph.rows.map((row, index) => {
                const commit = row.commit;
                const isHead = index === 0 && status.branch !== null;
                return h('div', { key: commit.hash, className: 'jb-logrow', 'data-selected': logSelected === commit.hash, onClick: () => loadCommit(commit.hash) },
                  graphRowSvg(row, graph.maxLanes, isHead ? status.branch : null),
                  h('span', { className: 'jb-col-msg', title: commit.subject }, commit.subject),
                  h('span', { className: 'jb-col-author', title: commit.email }, commit.author),
                  h('span', { className: 'jb-col-date' }, fmtDate(commit.date)),
                  h('span', { className: 'jb-col-hash', title: commit.hash }, commit.short));
              })),
          detailLoading
            ? h('div', { className: 'jb-logdetail' }, h('div', { className: 'jb-empty' }, t('loading')))
            : h(CommitDetail, { detail, t }));
      }

      return h('div', { className: 'jb-root' },
        h('style', null, css),
        toolbar,
        tabs,
        h('div', { className: 'jb-content' }, content));
    }

    // ------------------------------------------------------------- icon
    // Lucide "git-branch" (ISC License) as the sidebar panel icon.
    function GitIcon({ size }) {
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true,
        fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      },
        h('path', { d: 'M15 6a9 9 0 0 0-9 9V3' }),
        h('circle', { cx: 18, cy: 6, r: 3 }),
        h('circle', { cx: 6, cy: 18, r: 3 }));
    }

    // ------------------------------------------------------------- apply
    const inject = ['slots', 'locale'];
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'git-control: dictionaries');
      const t = ctx.locale.bind(NS);
      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main', key: PANEL_ID, locale: NS,
      }, GitPanel));
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: PANEL_ID, order: 20, locale: NS, label: () => t('panel'),
      }, GitIcon));
    }
    return { inject, apply };
  },
});
