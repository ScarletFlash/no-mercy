import { PART_OF_SPEECH } from '../../constants/part-of-speech.constant';
import { type DeepPartialValue } from '../../declarations/deep-partial-value.type';
import { type Options } from './parts-of-speech.options';

const COMPONENT_NAME_PATTERN = '^[A-Z](?=[A-Za-z0-9]*[a-z])[A-Za-z0-9]*$';

const TYPED_COMPONENT_NAME_PATTERN = '^(?=[A-Za-z0-9]*[a-z])[A-Z][A-Za-z0-9]*$';

const REACT_PACKAGE = 'react';

const REACT_NODE = 'ReactNode';

const COMPONENT_REQUIREMENT = { required: [PART_OF_SPEECH.Noun], appliesTo: 'Component' };

const COMPONENT_POLICY = {
  ...COMPONENT_REQUIREMENT,
  returnTypes: [
    { package: REACT_PACKAGE, name: REACT_NODE },
    { package: REACT_PACKAGE, name: 'ReactElement' },
    { package: REACT_PACKAGE, name: 'Element' },
    { package: 'typescript', name: 'Promise', typeArguments: [REACT_NODE] }
  ]
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
    variable: { [COMPONENT_NAME_PATTERN]: COMPONENT_POLICY, [TYPED_COMPONENT_NAME_PATTERN]: TYPED_COMPONENT_POLICY },
    function: { [COMPONENT_NAME_PATTERN]: COMPONENT_POLICY }
  }
};
