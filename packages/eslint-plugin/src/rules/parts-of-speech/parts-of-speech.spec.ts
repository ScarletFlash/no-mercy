import { join } from 'path';
import packageJson from '../../../package.json' with { type: 'json' };
import { runRuleTests } from '../../../tests/run-rule-tests';
import { ts } from '../../../tests/ts.template-tag';
import { PART_OF_SPEECH } from '../../constants/part-of-speech.constant';
import { getMergedOptions } from '../../utilities/get-merged-options.utility';
import { partsOfSpeech } from './parts-of-speech';
import { PARTS_OF_SPEECH_DEFAULT } from './parts-of-speech.default';
import { MessageId } from './parts-of-speech.message-id';
import { type Options } from './parts-of-speech.options';
import { PARTS_OF_SPEECH_REACT_COMPONENTS } from './parts-of-speech.react-components';

const FIXTURE_FILE = join(import.meta.dirname, '../../../tests/fixtures/file.ts');

const VALUE_POLICY = { required: [PART_OF_SPEECH.Noun], restricted: [PART_OF_SPEECH.Verb] };

const COMPONENT_OPTIONS = getMergedOptions<Options>({
  base: PARTS_OF_SPEECH_DEFAULT,
  override: PARTS_OF_SPEECH_REACT_COMPONENTS
});

const REACT_MODULE_DECLARATION = ts`
  declare module 'react' {
    export interface ReactElement {
      readonly type: string;
    }
    export type ReactNode = ReactElement | string | number | boolean | null | undefined;
    export namespace JSX {
      export interface Element extends ReactElement {}
    }
    export interface FunctionComponent {
      (props: object): ReactNode | Promise<ReactNode>;
    }
    export type FC = FunctionComponent;
    export interface ComponentClass {
      new (props: object): object;
    }
    export type ComponentType = ComponentClass | FunctionComponent;
  }
`;

const STATE_KIT_MODULE_DECLARATION = ts`
  declare module 'state-kit' {
    export interface Atom<Value> {
      readonly init: Value;
    }
    export interface WritableAtom<Value, Args extends unknown[], Result> extends Atom<Value> {
      write(...args: Args): Result;
    }
    export type PrimitiveAtom<Value> = WritableAtom<Value, [Value], void>;
  }
`;

const OTHER_KIT_MODULE_DECLARATION = ts`
  declare module 'other-kit' {
    export interface PrimitiveAtom<Value> {
      readonly init: Value;
    }
  }
`;

const REF_KIT_MODULE_DECLARATION = ts`
  declare module 'ref-kit' {
    export interface Ref<Value> {
      current: Value;
    }
  }
`;

const SCHEMA_KIT_MODULE_DECLARATION = ts`
  declare module 'schema-kit' {
    export interface Type<Shape> {
      (input: unknown): Shape;
      readonly infer: Shape;
    }
  }
`;

const FEATURE_FLAG_CODE = ts`
  interface FeatureFlag<Value> {
    readonly value: Value;
  }
  declare const isBetaEnabled: FeatureFlag<boolean>;
`;

const BOOLEAN_ATOM_OPTIONS: Options = {
  declarationPolicies: {
    variable: {
      '^is[A-Z]': { types: [{ package: 'state-kit', name: 'PrimitiveAtom' }], required: ['verb'] },
      default: VALUE_POLICY
    }
  }
};

const ACTION_ATOM_OPTIONS: Options = {
  declarationPolicies: {
    variable: {
      '.': {
        types: [{ package: 'state-kit', name: 'WritableAtom', typeArguments: ['null'] }],
        required: ['verb']
      },
      default: VALUE_POLICY
    }
  }
};

const BOOLEAN_MAP_OPTIONS: Options = {
  declarationPolicies: {
    variable: {
      '^is[A-Z]': {
        types: [{ package: 'typescript', name: 'Map', typeArguments: ['*', 'boolean'] }],
        required: ['verb']
      },
      default: VALUE_POLICY
    }
  }
};

const FUNCTION_REF_OPTIONS: Options = {
  declarationPolicies: {
    variable: {
      Ref$: { types: [{ package: 'ref-kit', name: 'Ref', typeArguments: ['function'] }], required: ['verb'] },
      default: VALUE_POLICY
    }
  }
};

const ATOM_MAP_OPTIONS: Options = {
  declarationPolicies: {
    variable: {
      '^is[A-Z]': {
        types: [
          {
            package: 'typescript',
            name: 'Map',
            typeArguments: ['*', { package: 'state-kit', name: 'PrimitiveAtom', typeArguments: ['boolean'] }]
          }
        ],
        required: ['verb']
      },
      default: VALUE_POLICY
    }
  }
};

const ATOM_REF_MAP_OPTIONS: Options = {
  declarationPolicies: {
    variable: {
      '^is[A-Z]': {
        types: [
          {
            package: 'typescript',
            name: 'Map',
            typeArguments: [
              '*',
              {
                package: 'ref-kit',
                name: 'Ref',
                typeArguments: [{ package: 'state-kit', name: 'PrimitiveAtom', typeArguments: ['boolean'] }]
              }
            ]
          }
        ],
        required: ['verb']
      },
      default: VALUE_POLICY
    }
  }
};

const PASCAL_CASE_FUNCTION_OPTIONS: Options = {
  declarationPolicies: { function: { '^[A-Z]': { required: ['noun'] }, default: { required: ['verb'] } } }
};

runRuleTests({
  ruleName: 'parts-of-speech',
  rule: partsOfSpeech,
  cases: {
    valid: [
      {
        name: 'Variable containing a noun should be allowed by the default policy',
        code: ts`const userPayload = { id: 1 };`
      },
      {
        name: 'Variable leading with a verb-homonym should be allowed because the homonym can also be a noun',
        code: ts`const requestPayload = { id: 1 };`
      },
      {
        name: 'Variable ending with a noun tagged only as a verb should be allowed by the default dictionary',
        code: ts`const childProcess = { id: 1 };`
      },
      {
        name: 'Variables with nouns tagged only as verbs should be allowed by the default dictionary',
        code: ts`
          const backgroundColor = '#fff';
          const clone = { id: 1 };
          const repetitionCount = 3;
          const account = { id: 1 };
          const deployTarget = 'production';
          const bundleSize = 3;
          const brandColor = '#fff';
          const decayRate = 0.5;
          const reportPath = '/tmp';
          const scheduleId = 1;
          const stripeApiKey = 'key';
          const firstSentence = 'a';
          const affixField = 'a';
          const autocompleteItem = { id: 1 };
          const budgetLimit = 1;
          const googleDrive = { id: 1 };
          const hookContext = { id: 1 };
          const taxRates = [1];
          const lineDiscounts = [1];
          const bulkAction = 'a';
          const deploymentGuideLink = 'a';
          const challengeWidget = { id: 1 };
          const batchesCount = 1;
          const authorizedParty = 'a';
          const billingCycleAnchor = 1;
          const multiselectValue = [1];
        `
      },
      {
        name: 'Variables holding only nouns tagged only as adjectives should be allowed by the default dictionary',
        code: ts`
          const square = 4;
          const intent = 'search';
          const average = 2;
          const modal = { id: 1 };
          const prompt = 'a';
          const testimonial = 'a';
          const credential = 'a';
          const observable = { id: 1 };
        `
      },
      {
        name: 'Variables holding only plural nouns tagged only as verbs should be allowed by the default dictionary',
        code: ts`
          const colors = ['#fff'];
          const averages = [2];
          const zeroes = [0];
          const prompts = ['a'];
          const affixes = ['a'];
        `
      },
      {
        name: 'Names containing an Object.prototype member name should be allowed by the default policy',
        code: ts`
          const constructorName = 'Widget';
          function getConstructor(): object {
            return {};
          }
        `
      },
      {
        name: 'Variable with a verb after TO describing a noun should be allowed by the default policy',
        code: ts`const fieldsToKeep = ['main'];`
      },
      {
        name: 'Variables naming a moment with a participle or a third-person verb before a trailing temporal preposition should be allowed by the default policy',
        code: ts`
          const createdAt = new Date();
          const updatedAt = new Date();
          const expiresAt = 1;
          const expiresIn = 3600;
        `
      },
      {
        name: 'Values named by a verb with a trailing particle should be allowed by the default policy',
        code: ts`
          const addIn = { id: 1 };
          const popUp = { id: 1 };
          function signUp(): void {}
        `
      },
      {
        name: 'Container holding a boolean should be allowed as a statement by a policy matching its type and package',
        options: [BOOLEAN_ATOM_OPTIONS],
        code: ts`
          ${STATE_KIT_MODULE_DECLARATION};
          declare const isBannerDismissed: import('state-kit').PrimitiveAtom<boolean>;
          declare const isMenuOpen: import('state-kit').PrimitiveAtom<boolean> | undefined;
        `
      },
      {
        name: 'Container holding no value should be allowed as an action by a policy matching its type arguments',
        options: [ACTION_ATOM_OPTIONS],
        code: ts`
          ${STATE_KIT_MODULE_DECLARATION};
          declare const deleteRow: import('state-kit').WritableAtom<null, [number], void>;
          declare const currentUser: import('state-kit').WritableAtom<string, [string], void>;
        `
      },
      {
        name: 'Callable schema should be allowed as a value by a policy matching its type and package',
        options: [
          {
            declarationPolicies: {
              variable: {
                '.': { types: [{ package: 'schema-kit', name: 'Type' }], required: ['noun'], restricted: ['verb'] },
                default: VALUE_POLICY
              }
            }
          }
        ],
        code: ts`
          ${SCHEMA_KIT_MODULE_DECLARATION};
          declare const authResponse: import('schema-kit').Type<string>;
        `
      },
      {
        name: 'Local container type should be allowed as a statement by a policy matching its file',
        options: [
          {
            declarationPolicies: {
              variable: {
                '^is[A-Z]': { types: [{ path: FIXTURE_FILE, name: 'FeatureFlag' }], required: ['verb'] },
                default: VALUE_POLICY
              }
            }
          }
        ],
        code: FEATURE_FLAG_CODE
      },
      {
        name: 'Local container type should be allowed as a statement by a policy matching its own package',
        options: [
          {
            declarationPolicies: {
              variable: {
                '^is[A-Z]': { types: [{ package: packageJson.name, name: 'FeatureFlag' }], required: ['verb'] },
                default: VALUE_POLICY
              }
            }
          }
        ],
        code: FEATURE_FLAG_CODE
      },
      {
        name: 'Functions leading with verbs tagged only as nouns should be allowed by the default dictionary',
        code: ts`
          function upsertClient(): void {}
          function parseIds(): void {}
          function provisionUser(): void {}
          function groupNodes(): void {}
        `
      },
      {
        name: 'Map of booleans should be allowed as a statement by a policy matching any key and a boolean value',
        options: [BOOLEAN_MAP_OPTIONS],
        code: ts`declare const isRequiredByApproverId: Map<number, boolean>;`
      },
      {
        name: 'Reference to a function should be allowed as an action by a policy matching a function type argument',
        options: [FUNCTION_REF_OPTIONS],
        code: ts`
          ${REF_KIT_MODULE_DECLARATION};
          declare const getItemsRef: import('ref-kit').Ref<() => string[]>;
        `
      },
      {
        name: 'Function leading with a verb should be allowed by the default policy',
        code: ts`
          function getUser(): object {
            return {};
          }
        `
      },
      {
        name: 'Class containing a noun should be allowed by the default policy',
        code: ts`class UserCard {}`
      },
      {
        name: 'Interface containing a noun should be allowed by the default policy',
        code: ts`interface UserProfile {}`
      },
      {
        name: 'Boolean-prefixed variable should be allowed because its prefix is a verb',
        code: ts`const isReady = Math.random() > 0.5;`
      },
      {
        name: 'Boolean-prefixed function should be allowed because its prefix is a verb',
        code: ts`
          function hasItems(): boolean {
            return Math.random() > 0.5;
          }
        `
      },
      {
        name: 'Callable variable leading with a verb should be allowed by the function type policy',
        code: ts`const buildReport = (): null => null;`
      },
      {
        name: 'PascalCase component should be allowed by its name pattern with a noun requirement',
        options: [PASCAL_CASE_FUNCTION_OPTIONS],
        code: ts`
          function UserCard(): null {
            return null;
          }
        `
      },
      {
        name: 'Word pinned by a verb dictionary should be allowed by a verb requirement',
        options: [
          { dictionary: { verb: ['status'] }, declarationPolicies: { enum: { default: { required: ['verb'] } } } }
        ],
        code: ts`
          enum Status {}
        `
      },
      {
        name: 'Callable PascalCase variable should be allowed by its name pattern over the callable type policy',
        options: [
          {
            declarationPolicies: {
              variable: { '^[A-Z]': { required: ['noun'] }, default: VALUE_POLICY }
            }
          }
        ],
        code: ts`const UserCard = (): null => null;`
      },
      {
        name: 'PascalCase components should be allowed by the React components preset',
        options: [COMPONENT_OPTIONS],
        code: ts`
          ${REACT_MODULE_DECLARATION};
          function UserCard(): import('react').ReactNode {
            return null;
          }
          function UserAvatar(): import('react').ReactElement | null {
            return null;
          }
          function HTMLPreview(): import('react').JSX.Element {
            return { type: 'div' };
          }
          async function UserPage(): Promise<import('react').ReactNode> {
            return null;
          }
          declare const UserList: () => import('react').ReactNode;
          declare const UserMenu: import('react').FC;
        `
      },
      {
        name: 'Async components resolving to a React element should be allowed by the React components preset',
        options: [COMPONENT_OPTIONS],
        code: ts`
          ${REACT_MODULE_DECLARATION};
          async function UserPanel(): Promise<import('react').JSX.Element> {
            return { type: 'div' };
          }
          async function UserBanner(): Promise<import('react').ReactElement> {
            return { type: 'div' };
          }
        `
      },
      {
        name: 'Variable typed with a union alias should be matched by its alias',
        options: [
          {
            declarationPolicies: {
              variable: {
                '.': { types: [{ package: 'react', name: 'ReactNode' }], required: ['verb'] },
                default: VALUE_POLICY
              }
            }
          }
        ],
        code: ts`
          ${REACT_MODULE_DECLARATION};
          declare const showContent: import('react').ReactNode;
        `
      },
      {
        name: 'Name pattern holding several policies should apply the first one whose type conditions hold',
        options: [
          {
            declarationPolicies: {
              variable: {
                '.': [
                  { types: [{ package: 'schema-kit', name: 'Type' }], required: ['noun'], restricted: ['verb'] },
                  { required: ['verb'] }
                ],
                default: VALUE_POLICY
              }
            }
          }
        ],
        code: ts`
          ${SCHEMA_KIT_MODULE_DECLARATION};
          declare const authResponse: import('schema-kit').Type<string>;
          const calculate = 1;
        `
      },
      {
        name: 'Map of containers should be allowed as a statement by a policy matching its type arguments by type and package',
        options: [ATOM_MAP_OPTIONS],
        code: ts`
          ${STATE_KIT_MODULE_DECLARATION};
          declare const isExpandedByRowId: Map<number, import('state-kit').PrimitiveAtom<boolean>>;
        `
      },
      {
        name: 'Map of references to containers should be allowed as a statement by a policy matching nested type arguments by type and package',
        options: [ATOM_REF_MAP_OPTIONS],
        code: ts`
          ${REF_KIT_MODULE_DECLARATION};
          ${STATE_KIT_MODULE_DECLARATION};
          declare const isExpandedRefByRowId: Map<
            number,
            import('ref-kit').Ref<import('state-kit').PrimitiveAtom<boolean>>
          >;
        `
      },
      {
        name: 'SCREAMING_SNAKE constant should keep the default policy with the React components preset',
        options: [COMPONENT_OPTIONS],
        code: ts`const MAX_RETRIES = 3;`
      }
    ],
    invalid: [
      {
        name: 'Variable holding only a verb should be reported by the default policy',
        code: ts`const calculate = 1;`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Variable leading with a verb-only word should be reported by the default restricted policy',
        code: ts`const calculatePayload = 1;`,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Name missing a required part of speech should be reported with the reading of every word',
        code: ts`class ActiveCalculate {}`,
        errors: [
          {
            messageId: MessageId.MissingRequiredPartOfSpeech,
            data: { name: 'ActiveCalculate', partsOfSpeech: 'noun', readings: 'active → adjective, calculate → verb' }
          }
        ]
      },
      {
        name: 'Name containing a restricted part of speech should be reported with the reading of the offending word only',
        code: ts`const calculatePayload = 1;`,
        errors: [
          {
            messageId: MessageId.RestrictedPartOfSpeech,
            data: { name: 'calculatePayload', partsOfSpeech: 'verb', readings: 'calculate → verb' }
          }
        ]
      },
      {
        name: 'Variable with a base-form verb before a trailing temporal preposition should be reported for lacking a noun',
        code: ts`const cancelAt = 1;`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Variable without a noun should be reported even with a preposition that used to read as a noun',
        code: ts`const ifActive = 1;`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Name made of function words only should be reported with them read as function words',
        code: ts`const since = new Date();`,
        errors: [
          {
            messageId: MessageId.MissingRequiredPartOfSpeech,
            data: { name: 'since', partsOfSpeech: 'noun', readings: 'since → function word' }
          }
        ]
      },
      {
        name: 'Variable leading with a verb that does not follow TO should be reported by the default restricted policy',
        code: ts`const keepFields = ['main'];`,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Variable leading with a verb-only word should be reported even with a verb after TO describing a noun',
        code: ts`const calculateTotalToKeep = 1;`,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Variable with a verb after a leading TO should be reported because no noun precedes TO',
        code: ts`const toKeep = [1];`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Function holding only a noun should be reported by the default policy',
        code: ts`
          function user(): object {
            return {};
          }
        `,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Class holding only an adjective should be reported by the default policy',
        code: ts`class Active {}`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Predicate-named non-boolean variable should be reported by the default policy',
        code: ts`const isReady = { value: true };`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'PascalCase component without a noun should be reported by its name pattern',
        options: [PASCAL_CASE_FUNCTION_OPTIONS],
        code: ts`
          function Active(): null {
            return null;
          }
        `,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'PascalCase component without a noun should be reported by the React components preset',
        options: [COMPONENT_OPTIONS],
        code: ts`
          ${REACT_MODULE_DECLARATION};
          function Active(): import('react').ReactNode {
            return null;
          }
        `,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeechForApplication }]
      },
      {
        name: 'PascalCase variable typed as a React component should be reported by the React components preset',
        options: [COMPONENT_OPTIONS],
        code: ts`
          ${REACT_MODULE_DECLARATION};
          declare const Active: import('react').FC;
          declare const Ready: import('react').ComponentType;
        `,
        errors: [
          { messageId: MessageId.MissingRequiredPartOfSpeechForApplication },
          { messageId: MessageId.MissingRequiredPartOfSpeechForApplication }
        ]
      },
      {
        name: 'PascalCase function returning no React node should be reported by the default policy with the React components preset',
        options: [COMPONENT_OPTIONS],
        code: ts`
          ${REACT_MODULE_DECLARATION};
          function UserAvatar(): string {
            return '';
          }
        `,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'PascalCase non-callable variable should be reported by the default policy with the React components preset',
        options: [COMPONENT_OPTIONS],
        code: ts`const CreateUser = 'user';`,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Function returning a React node from another package should be reported by the default policy with the React components preset',
        options: [COMPONENT_OPTIONS],
        code: ts`
          declare module 'other-kit' {
            export type ReactNode = string;
          }
          function UserAvatar(): import('other-kit').ReactNode {
            return '';
          }
        `,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Container with the same name from another package should be reported by the default policy',
        options: [BOOLEAN_ATOM_OPTIONS],
        code: ts`
          ${OTHER_KIT_MODULE_DECLARATION};
          declare const isBannerDismissed: import('other-kit').PrimitiveAtom<boolean>;
        `,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Container holding a value should be reported by the default policy when the policy expects no value',
        options: [ACTION_ATOM_OPTIONS],
        code: ts`
          ${STATE_KIT_MODULE_DECLARATION};
          declare const deleteRow: import('state-kit').WritableAtom<string, [string], void>;
        `,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Callable schema should be reported as a function by the default policy',
        code: ts`
          ${SCHEMA_KIT_MODULE_DECLARATION};
          declare const authResponse: import('schema-kit').Type<string>;
        `,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeech }]
      },
      {
        name: 'Local container type should be reported by the default policy when the policy names another file',
        options: [
          {
            declarationPolicies: {
              variable: {
                '^is[A-Z]': { types: [{ path: 'src/other.ts', name: 'FeatureFlag' }], required: ['verb'] },
                default: VALUE_POLICY
              }
            }
          }
        ],
        code: FEATURE_FLAG_CODE,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Local container type should be reported by the default policy when the policy names another package',
        options: [
          {
            declarationPolicies: {
              variable: {
                '^is[A-Z]': { types: [{ package: 'other-package', name: 'FeatureFlag' }], required: ['verb'] },
                default: VALUE_POLICY
              }
            }
          }
        ],
        code: FEATURE_FLAG_CODE,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Map of strings should be reported by the default policy when the policy expects boolean values',
        options: [BOOLEAN_MAP_OPTIONS],
        code: ts`declare const isRequiredByApproverId: Map<number, string>;`,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Map of containers should be reported by the default policy when the type argument policy names another package',
        options: [ATOM_MAP_OPTIONS],
        code: ts`
          ${OTHER_KIT_MODULE_DECLARATION};
          declare const isExpandedByRowId: Map<number, import('other-kit').PrimitiveAtom<boolean>>;
        `,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Map of references to containers should be reported by the default policy when the nested type argument policy names another package',
        options: [ATOM_REF_MAP_OPTIONS],
        code: ts`
          ${REF_KIT_MODULE_DECLARATION};
          ${OTHER_KIT_MODULE_DECLARATION};
          declare const isExpandedRefByRowId: Map<
            number,
            import('ref-kit').Ref<import('other-kit').PrimitiveAtom<boolean>>
          >;
        `,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Reference to a value should be reported by the default policy when the policy expects a function',
        options: [FUNCTION_REF_OPTIONS],
        code: ts`
          ${REF_KIT_MODULE_DECLARATION};
          declare const getItemsRef: import('ref-kit').Ref<string[]>;
        `,
        errors: [{ messageId: MessageId.RestrictedPartOfSpeech }]
      },
      {
        name: 'Labelled policy should report with its application name in the message',
        options: [
          {
            declarationPolicies: {
              variable: {
                '^[A-Z]': { required: ['noun'], appliesTo: 'React Component' },
                default: VALUE_POLICY
              }
            }
          }
        ],
        code: ts`const Active = (): null => null;`,
        errors: [{ messageId: MessageId.MissingRequiredPartOfSpeechForApplication }]
      }
    ]
  }
});
