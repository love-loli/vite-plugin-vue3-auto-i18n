import type babelCore from '@babel/core'
import { template } from '@babel/core'
import { hasImportedMember } from '../utils/index'
interface VisitorState {
  file: {
    opts: babelCore.TransformOptions
  }
}
/*
1. import { useI18n } from 'vue-i18n' ✅
  - Judging whether statement is repeated ✅
2. const { t } = useI18n() ✅
  - Judging whether statement is repeated(inside setup function,if any) ✅
  - below import statement of useI18n ✅
3. ref(s) => ref(t('xxx'))
  - if theres no 'ref' imported,import ref ✅
4. s => computed(()=>t('xxx'))
  - if theres no 'computed' imported,import computed ✅
*/
function addImportStatement(
  { types: t, template }: typeof babelCore,
  path: babelCore.NodePath<babelCore.types.Program>,
) {
  if (path.node.body.length === 0) {
    path.node.body.push(
      template.ast(
        'import { ref,computed } from \'vue\'',
      ) as babelCore.types.Statement,
      template.ast(
        'import { useI18n } from "vue-i18n"',
      ) as babelCore.types.Statement,
    )
    path.skip()
  }

  const imports = path.node.body.filter(
    node => node.type === 'ImportDeclaration',
  )

  const i18nImport = imports.find(
    node =>
      node.type === 'ImportDeclaration' && node.source.value === 'vue-i18n',
  ) as babelCore.types.ImportDeclaration | undefined
  if (!i18nImport) {
    path.node.body.unshift(
      t.importDeclaration(
        [t.importSpecifier(t.identifier('useI18n'), t.identifier('useI18n'))],
        t.stringLiteral('vue-i18n'),
      ),
    )
  }
  else {
    if (!hasImportedMember(i18nImport, 'useI18n')) {
      i18nImport.specifiers.push(
        t.importSpecifier(t.identifier('useI18n'), t.identifier('useI18n')),
      )
    }
  }

  const vueImport = imports.find(
    node => node.type === 'ImportDeclaration' && node.source.value === 'vue',
  ) as babelCore.types.ImportDeclaration | undefined
  if (!vueImport) {
    path.node.body.unshift(
      t.importDeclaration(
        [
          t.importSpecifier(t.identifier('ref'), t.identifier('ref')),
          t.importSpecifier(t.identifier('computed'), t.identifier('computed')),
        ],
        t.stringLiteral('vue'),
      ),
    )
  }
  else {
    if (!hasImportedMember(vueImport, 'ref')) {
      vueImport.specifiers.push(
        t.importSpecifier(t.identifier('ref'), t.identifier('ref')),
      )
    }
    if (!hasImportedMember(vueImport, 'computed')) {
      vueImport.specifiers.push(
        t.importSpecifier(t.identifier('computed'), t.identifier('computed')),
      )
    }
  }
}

function addVariableDeclaration(node: babelCore.types.Statement[]) {
  if (
    !node.some(
      n =>
        n.type === 'VariableDeclaration'
        && n.declarations.some(
          v =>
            v.init?.type === 'CallExpression'
            && v.init.callee.type === 'Identifier'
            && v.init.callee.name === 'useI18n'
            && v.id.type === 'ObjectPattern'
            && v.id.properties.some(
              p =>
                p.type === 'ObjectProperty'
                && p.key.type === 'Identifier'
                && p.key.name === 't',
            ),
        ),
    )
  ) {
    const idx = node.findIndex(n => n.type !== 'ImportDeclaration')
    node.splice(idx, 0, template.ast(
      'const { t } = useI18n()',
    ) as babelCore.types.Statement)
  }
}

export default function(
  babel: typeof babelCore,
): babelCore.PluginObj<VisitorState> {
  return {
    visitor: {
      Program(path) {
        addImportStatement(babel, path)
        if (path.node.body.some(p => p.type === 'ExportDefaultDeclaration')) {
          path.scope.traverse(path.node, {
            ExportDefaultDeclaration(p) {
              p.scope.traverse(p.node, {
                ObjectMethod({ node }) {
                  if (
                    node.kind === 'method'
                    && node.key.type === 'Identifier'
                    && node.key.name === 'setup'
                  )
                    addVariableDeclaration(node.body.body)
                },
              })
            },
          })
        }
        else {
          addVariableDeclaration(path.node.body)
        }
      },
    },
  }
}
