<template>
  <div
    ref="editorRoot"
    class="yaml-code-viewer overflow-hidden"
  />
</template>

<script setup lang="ts">
import { yaml } from '@codemirror/lang-yaml'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  code: string
  label: string
}>()

const editorRoot = ref<HTMLDivElement>()
let editorView: EditorView | undefined

const yamlHighlightStyle = HighlightStyle.define([
  {
    tag: [tags.propertyName, tags.definition(tags.propertyName)],
    class: 'cm-yaml-key',
  },
  {
    tag: [tags.string, tags.content, tags.attributeValue],
    class: 'cm-yaml-value',
  },
  {
    tag: [tags.bool, tags.number, tags.atom, tags.null],
    class: 'cm-yaml-constant',
  },
  { tag: tags.lineComment, class: 'cm-yaml-comment' },
  { tag: [tags.keyword, tags.meta], class: 'cm-yaml-meta' },
  { tag: [tags.labelName, tags.typeName], class: 'cm-yaml-reference' },
  {
    tag: [tags.separator, tags.punctuation, tags.squareBracket, tags.brace],
    class: 'cm-yaml-punctuation',
  },
])

const viewerTheme = EditorView.theme({
  '&': {
    minHeight: '16rem',
    maxHeight: 'min(75dvh, 40rem)',
    backgroundColor: 'transparent',
    color: 'var(--color-base-content)',
    fontSize: '0.75rem',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    lineHeight: '1.5',
  },
  '.cm-content': {
    minWidth: 'max-content',
    padding: '0.5rem 0',
    caretColor: 'transparent',
  },
  '.cm-line': {
    padding: '0 1rem',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-base-150)',
    color: 'color-mix(in srgb, var(--color-base-content) 42%, transparent)',
    border: 'none',
    borderRight: '1px solid var(--color-base-border)',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    minWidth: '3.25rem',
    padding: '0 0.75rem 0 0.5rem',
  },
  '&.cm-focused': {
    outline: '2px solid color-mix(in srgb, var(--color-primary) 45%, transparent)',
    outlineOffset: '-2px',
  },
})

onMounted(() => {
  if (!editorRoot.value) return

  editorView = new EditorView({
    parent: editorRoot.value,
    state: EditorState.create({
      doc: props.code,
      extensions: [
        lineNumbers(),
        yaml(),
        syntaxHighlighting(yamlHighlightStyle),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.contentAttributes.of({
          'aria-label': props.label,
          'aria-readonly': 'true',
          tabindex: '0',
        }),
        viewerTheme,
      ],
    }),
  })
})

watch(
  () => props.code,
  (code) => {
    if (!editorView || code === editorView.state.doc.toString()) return

    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: code,
      },
    })
  },
)

onBeforeUnmount(() => {
  editorView?.destroy()
})
</script>

<style scoped>
.yaml-code-viewer {
  background: color-mix(in srgb, var(--color-base-100) 88%, var(--color-base-200));
}

:deep(.cm-editor) {
  font-variant-ligatures: none;
  tab-size: 2;
}

:deep(.cm-lineNumbers) {
  user-select: none;
}

:deep(.cm-content ::selection) {
  background-color: color-mix(in srgb, var(--color-primary) 32%, transparent);
}

:deep(.cm-yaml-key) {
  color: var(--color-primary);
}

:deep(.cm-yaml-value) {
  color: color-mix(in oklch, var(--color-warning) 78%, var(--color-base-content));
}

:deep(.cm-yaml-constant) {
  color: var(--color-info);
}

:deep(.cm-yaml-comment) {
  color: color-mix(in srgb, var(--color-base-content) 46%, transparent);
  font-style: italic;
}

:deep(.cm-yaml-meta),
:deep(.cm-yaml-reference) {
  color: var(--color-secondary);
}

:deep(.cm-yaml-punctuation) {
  color: color-mix(in srgb, var(--color-base-content) 58%, transparent);
}
</style>
