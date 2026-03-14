<script setup>
import { useTemplateRef } from 'vue';

const textElement = useTemplateRef('textElement');

function selectText() {
  const range = document.createRange();
  range.selectNodeContents(textElement.value);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}
</script>

<template>
  <span ref="textElement" @click="selectText">
    <slot />
  </span>
</template>
