<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Bold, Italic, List, ListOrdered, Quote, Redo2, RemoveFormatting, Strikethrough, UnderlineIcon, Undo2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const props = withDefaults(defineProps<{
  modelValue: string | null
  disabled?: boolean
  error?: string
  placeholder?: string
}>(), { disabled: false, error: '', placeholder: 'Nhập mô tả chi tiết sản phẩm...' })
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

function normalize(html: string): string | null {
  return /^(?:\s|<p>(?:\s|<br\s*\/?\s*>)*<\/p>)*$/i.test(html) ? null : html
}

const editor = useEditor({
  content: props.modelValue ?? '',
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      link: false,
      underline: false,
    }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: props.placeholder }),
    CharacterCount.configure({ limit: 100_000 }),
  ],
  onUpdate: ({ editor: current }) => emit('update:modelValue', normalize(current.getHTML())),
})

watch(() => props.modelValue, (value) => {
  if (!editor.value || normalize(editor.value.getHTML()) === value) return
  editor.value.commands.setContent(value ?? '', { emitUpdate: false })
})
watch(() => props.disabled, (disabled) => editor.value?.setEditable(!disabled))

function setLink() {
  if (!editor.value) return
  const previous = editor.value.getAttributes('link').href as string | undefined
  const href = window.prompt('Nhập đường dẫn (https://...)', previous ?? 'https://')
  if (href === null) return
  if (!href.trim()) editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
  else editor.value.chain().focus().extendMarkRange('link').setLink({ href: href.trim(), target: '_blank' }).run()
}

function setHeading(value: unknown) {
  const level = Number(value)
  if (level !== 2 && level !== 3 && level !== 4) return
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div class="overflow-hidden rounded-md border bg-background" :class="error ? 'border-destructive' : 'border-input'">
    <div class="flex max-w-full flex-wrap gap-1 border-b bg-muted/30 p-2" role="toolbar" aria-label="Định dạng mô tả">
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Hoàn tác" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().undo().run()"><Undo2 class="h-4 w-4" /></Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Làm lại" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().redo().run()"><Redo2 class="h-4 w-4" /></Button>
      <Select default-value="2" :disabled="disabled" @update:model-value="setHeading">
        <SelectTrigger class="h-8 w-20 text-xs" aria-label="Tiêu đề"><SelectValue placeholder="H2" /></SelectTrigger>
        <SelectContent class="z-[70]"><SelectItem value="2">H2</SelectItem><SelectItem value="3">H3</SelectItem><SelectItem value="4">H4</SelectItem></SelectContent>
      </Select>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="In đậm" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().toggleBold().run()"><Bold class="h-4 w-4" /></Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="In nghiêng" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().toggleItalic().run()"><Italic class="h-4 w-4" /></Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Gạch chân" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().toggleUnderline().run()"><UnderlineIcon class="h-4 w-4" /></Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Gạch ngang" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().toggleStrike().run()"><Strikethrough class="h-4 w-4" /></Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Danh sách" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().toggleBulletList().run()"><List class="h-4 w-4" /></Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Danh sách số" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().toggleOrderedList().run()"><ListOrdered class="h-4 w-4" /></Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Trích dẫn" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().toggleBlockquote().run()"><Quote class="h-4 w-4" /></Button>
      <Button type="button" size="sm" variant="ghost" :disabled="disabled" @mousedown.prevent @click="setLink">Liên kết</Button>
      <Button type="button" size="sm" variant="ghost" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().setTextAlign('left').run()">Trái</Button>
      <Button type="button" size="sm" variant="ghost" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().setTextAlign('center').run()">Giữa</Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Xóa định dạng" :disabled="disabled" @mousedown.prevent @click="editor?.chain().focus().clearNodes().unsetAllMarks().run()"><RemoveFormatting class="h-4 w-4" /></Button>
    </div>
    <EditorContent :editor="editor" class="product-description-editor min-h-48 px-4 py-3" />
    <div class="border-t px-3 py-1 text-right text-xs text-muted-foreground">{{ editor?.storage.characterCount.characters() ?? 0 }} ký tự</div>
  </div>
  <p v-if="error" class="mt-1 text-xs text-destructive">{{ error }}</p>
</template>

<style>
.product-description-editor .tiptap { min-height: 10rem; outline: none; }
.product-description-editor .tiptap p.is-editor-empty:first-child::before { color: hsl(var(--muted-foreground)); content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
.product-description-editor .tiptap ul { list-style: disc; padding-left: 1.5rem; }
.product-description-editor .tiptap ol { list-style: decimal; padding-left: 1.5rem; }
.product-description-editor .tiptap blockquote { border-left: 3px solid hsl(var(--border)); padding-left: 1rem; }
</style>
