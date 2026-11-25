import { regex } from 'arkregex';
import { PART_OF_SPEECH } from '../../constants/part-of-speech.constant';
import { type DeepPartialValue } from '../../declarations/deep-partial-value.type';
import { type Options } from './parts-of-speech.options';

const COMPONENT_NAME_PATTERN = regex('^[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9]*$').source;

const REACT_PACKAGE = 'react';

const REACT_NODE_TYPES = [
  { package: REACT_PACKAGE, name: 'ReactNode' },
  { package: REACT_PACKAGE, name: 'ReactElement' },
  { package: REACT_PACKAGE, name: 'Element' }
];

const COMPONENT_REQUIREMENT = { required: [PART_OF_SPEECH.Noun], appliesTo: 'Component' };

const COMPONENT_POLICY = {
  ...COMPONENT_REQUIREMENT,
  returnTypes: REACT_NODE_TYPES.concat(
    REACT_NODE_TYPES.map((reactNodeType: (typeof REACT_NODE_TYPES)[number]) => ({
      package: 'typescript',
      name: 'Promise',
      typeArguments: [reactNodeType]
    }))
  )
};

const TYPED_COMPONENT_POLICY = {
  ...COMPONENT_REQUIREMENT,
  types: [
    { package: REACT_PACKAGE, name: 'FunctionComponent' },
    { package: REACT_PACKAGE, name: 'ComponentType' }
  ]
};

export const PARTS_OF_SPEECH_REACT_COMPONENTS: DeepPartialValue<Options> = {
  declarationPolicies: {
    variable: { [COMPONENT_NAME_PATTERN]: [COMPONENT_POLICY, TYPED_COMPONENT_POLICY] },
    function: { [COMPONENT_NAME_PATTERN]: COMPONENT_POLICY }
  }
};
