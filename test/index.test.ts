import { describe, expect, test } from 'vitest'
import { start } from '../src/index'
import { getMatchedMsgPath } from '../src/utils'

const isMatchedStr = (target: string) => getMatchedMsgPath({
  en: {
    message: {
      hello: 'hello world',
      hi: 'hi',
    },
  },
  ch: {
    message: {
      hello: '你好，世界',
      hi: '嗨',
    },
  },
}, target)

const testFunc = (source: string) => start(source, isMatchedStr)

describe('import test', () => {
  test('All absence', async() => {
    expect(await testFunc(`
    <script setup>
      import { a } from "b"
    </script>`))
      .toMatchInlineSnapshot(`
        "
            <script setup>import { ref, computed } from \\"vue\\";
        import { useI18n } from \\"vue-i18n\\";
        const {
          t
        } = useI18n();
        import { a } from \\"b\\";</script>"
      `)
  })

  test('no ref', async() => {
    expect(await testFunc(`
    <script setup>
      import {computed} from "vue";
      import {useI18n} from "vue-i18n"
    </script>
    `)).toMatchInlineSnapshot(`
      "
          <script setup>import { computed, ref } from \\"vue\\";
      const {
        t
      } = useI18n();
      import { useI18n } from \\"vue-i18n\\";</script>
          "
    `)
  })

  test('no computed', async() => {
    expect(await testFunc(`
    <script setup>
      import {ref} from "vue";
      import {useI18n} from "vue-i18n"
    </script>
    `)).toMatchInlineSnapshot(`
      "
          <script setup>import { ref, computed } from \\"vue\\";
      const {
        t
      } = useI18n();
      import { useI18n } from \\"vue-i18n\\";</script>
          "
    `)
  })

  test('no useI18n', async() => {
    expect(await testFunc(`
        <script setup>
          import {ref,computed} from "vue";import {shit} from "vue-i18n"
        </script>
      `))
      .toMatchInlineSnapshot(`
        "
                <script setup>import { ref, computed } from \\"vue\\";
        const {
          t
        } = useI18n();
        import { shit, useI18n } from \\"vue-i18n\\";</script>
              "
      `)
  })
})

describe('variable test', () => {
  test('no useI18n', async() => {
    expect(await testFunc(`
      <script setup>
        const a = "xxx"
      </script>
    `))
      .toMatchInlineSnapshot(`
        "
              <script setup>import { ref, computed } from \\"vue\\";
        import { useI18n } from \\"vue-i18n\\";
        const {
          t
        } = useI18n();
        const a = \\"xxx\\";</script>
            "
      `)
  })

  test('no useI18n(inside setup)', async() => {
    expect(await testFunc(`
      <script>
      export default{
        setup(){
          const a = "xxx"
        }
      }
      </script>
    `))
      .toMatchInlineSnapshot(`
        "
              <script>import { ref, computed } from \\"vue\\";
        import { useI18n } from \\"vue-i18n\\";
        export default {
          setup() {
            const {
              t
            } = useI18n();
            const a = \\"xxx\\";
          }

        };</script>
            "
      `)
  })

  test('no { t }', async() => {
    expect(await testFunc(`
      <script setup>
        const { other } = useI18n()
      </script>
    `))
      .toMatchInlineSnapshot(`
        "
              <script setup>import { ref, computed } from \\"vue\\";
        import { useI18n } from \\"vue-i18n\\";
        const {
          t
        } = useI18n();
        const {
          other
        } = useI18n();</script>
            "
      `)
  })

  test('no { t }(inside setup)', async() => {
    expect(await testFunc(`
    <script>
    export default{
      setup(){
        const { other } = useI18n()
      }
    }
    </script>
    `))
      .toMatchInlineSnapshot(`
        "
            <script>import { ref, computed } from \\"vue\\";
        import { useI18n } from \\"vue-i18n\\";
        export default {
          setup() {
            const {
              t
            } = useI18n();
            const {
              other
            } = useI18n();
          }

        };</script>
            "
      `)
  })
})

describe('replace test', () => {
  test('setup script', async() => {
    expect(await testFunc(`
      <script setup>
        const num = 10
        const str1 = 'misMatched'
        const str2 = ref('hello world')
        const str3 = 'hi'
      </script>
    `)).toMatchInlineSnapshot(`
      "
            <script setup>import { ref, computed } from \\"vue\\";
      import { useI18n } from \\"vue-i18n\\";
      const {
        t
      } = useI18n();
      const num = 10;
      const str1 = 'misMatched';
      const str2 = ref(t('message.hello'));
      const str3 = computed(() => t('message.hi'));</script>
          "
    `)
  })

  test('setup func', async() => {
    expect(await testFunc(`
      <script>
        export default{
          setup(){
            const num = 10
            const str1 = 'misMatched'
            const str2 = ref('hello world')
            const str3 = 'hi'
          }
        }
      </script>
    `)).toMatchInlineSnapshot(`
      "
            <script>import { ref, computed } from \\"vue\\";
      import { useI18n } from \\"vue-i18n\\";
      export default {
        setup() {
          const {
            t
          } = useI18n();
          const num = 10;
          const str1 = 'misMatched';
          const str2 = ref(t('message.hello'));
          const str3 = computed(() => t('message.hi'));
        }
      
      };</script>
          "
    `)
  })
})

describe('template test', () => {
  test('plain node', async() => {
    expect(await testFunc(`
      <template>
        <div>hi</div>
        <ul>
          <li v-if="x">misMatched</li>
          <li v-else>hello world</li>
          <li v-once>misMatched</li>
        </ul>
        <Custom>
          <template #header>
            <p>hello world</p>
          </template>
        </Custom>
      </template>
    `)).toMatchInlineSnapshot(`
      "
            <template>
              <div>$t('message.hi')</div>
              <ul>
                <li v-if=\\"x\\">misMatched</li>
                <li v-else>$t('message.hello')</li>
                <li v-once>misMatched</li>
              </ul>
              <Custom>
                <template #header>
                  <p>$t('message.hello')</p>
                </template>
              </Custom>
            </template>
          "
    `)
  })
})
