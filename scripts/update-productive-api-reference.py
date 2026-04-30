#!/usr/bin/env python3
import argparse
import json
import re
import sys
from collections import OrderedDict
from pathlib import Path
from typing import Any

import requests
import yaml

SPEC_URL = 'https://developer.productive.io/reference/download_spec'
ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'packages/mcp/src/api-reference/generated.ts'

OPERATOR_NAMES = {
    'eq',
    'not_eq',
    'contains',
    'not_contain',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'not_in',
    'is_null',
    'present',
}
METHODS = ('GET', 'POST', 'PATCH', 'PUT', 'DELETE')


def fetch_spec() -> dict[str, Any]:
    response = requests.get(SPEC_URL, timeout=60)
    response.raise_for_status()
    text = response.content.decode('utf-8', 'ignore')
    return yaml.safe_load(text)


def resolve_pointer(document: dict[str, Any], ref: str) -> Any:
    if not ref.startswith('#/'):
        raise ValueError(f'Unsupported ref: {ref}')

    current: Any = document
    for part in ref[2:].split('/'):
        part = part.replace('~1', '/').replace('~0', '~')
        current = current[part]
    return current


def deref(document: dict[str, Any], value: Any) -> Any:
    while isinstance(value, dict) and '$ref' in value:
        value = resolve_pointer(document, value['$ref'])
    return value


def normalize_path(path: str) -> str:
    return re.sub(r'^/api/v2', '', path)


def scalar_schema_info(document: dict[str, Any], schema: dict[str, Any] | None) -> dict[str, Any]:
    if not schema:
        return {}

    schema = deref(document, schema)

    if 'oneOf' in schema:
        for candidate in schema['oneOf']:
            info = scalar_schema_info(document, candidate)
            if info:
                return info
        return {}

    if 'anyOf' in schema:
        for candidate in schema['anyOf']:
            info = scalar_schema_info(document, candidate)
            if info:
                return info
        return {}

    info: dict[str, Any] = {}
    for key in ('type', 'format', 'description', 'enum'):
        if key in schema:
            info[key] = schema[key]
    return info


def extract_filter_spec(document: dict[str, Any], schema: dict[str, Any]) -> dict[str, Any]:
    schema = deref(document, schema)

    properties = schema.get('properties', {})
    filters: OrderedDict[str, Any] = OrderedDict()

    for name in sorted(properties):
        field_schema = deref(document, properties[name])
        spec: dict[str, Any] = {}
        operators: OrderedDict[str, Any] = OrderedDict()
        scalar_info: dict[str, Any] = {}

        variants = field_schema.get('oneOf') or field_schema.get('anyOf') or [field_schema]
        for variant in variants:
            variant = deref(document, variant)
            variant_properties = variant.get('properties', {}) if isinstance(variant, dict) else {}
            operator_keys = [key for key in variant_properties if key in OPERATOR_NAMES]

            if operator_keys:
                for operator in sorted(operator_keys):
                    operator_schema = deref(document, variant_properties[operator])
                    operator_info = scalar_schema_info(document, operator_schema)
                    operator_entry = {}
                    if operator_info.get('description'):
                        operator_entry['description'] = operator_info['description']
                    operators[operator] = operator_entry
                    if not scalar_info:
                        scalar_info = operator_info
            else:
                candidate_info = scalar_schema_info(document, variant)
                if candidate_info and not scalar_info:
                    scalar_info = candidate_info

        for key in ('type', 'format', 'description', 'enum'):
            if key in scalar_info:
                spec[key] = scalar_info[key]
            elif key in field_schema:
                spec[key] = field_schema[key]

        if operators:
            spec['operators'] = operators

        filters[name] = spec

    return filters


def extract_filters(document: dict[str, Any], filter_parameter: dict[str, Any]) -> dict[str, Any]:
    parameter = deref(document, filter_parameter)
    schema = deref(document, parameter.get('schema', {}))

    if 'oneOf' in schema:
        for variant in schema['oneOf']:
            variant = deref(document, variant)
            if variant.get('properties') and '$op' not in variant.get('properties', {}):
                return extract_filter_spec(document, variant)
            title = variant.get('title', '').lower()
            if variant.get('properties') and 'advanced filters' not in title:
                return extract_filter_spec(document, variant)
            if '$ref' in variant:
                dereferenced = deref(document, variant)
                if dereferenced.get('properties'):
                    return extract_filter_spec(document, dereferenced)

        for variant in schema['oneOf']:
            variant = deref(document, variant)
            if variant.get('properties'):
                return extract_filter_spec(document, variant)

    if schema.get('properties'):
        return extract_filter_spec(document, schema)

    return {}


def param_type(document: dict[str, Any], parameter: dict[str, Any]) -> str | None:
    schema = deref(document, parameter.get('schema', {}))
    if not isinstance(schema, dict):
        return None

    if schema.get('type'):
        return schema['type']
    if 'items' in schema:
        return 'array'
    if 'oneOf' in schema or 'anyOf' in schema:
        info = scalar_schema_info(document, schema)
        return info.get('type')
    return None


def generate_reference(spec: dict[str, Any]) -> OrderedDict[str, Any]:
    reference: OrderedDict[str, Any] = OrderedDict()

    for raw_path in sorted(spec.get('paths', {})):
        endpoint = spec['paths'][raw_path]
        normalized_path = normalize_path(raw_path)
        methods: OrderedDict[str, Any] = OrderedDict()

        for method_name in METHODS:
            operation = endpoint.get(method_name.lower())
            if not operation:
                continue

            operation = deref(spec, operation)
            parameters = [deref(spec, parameter) for parameter in operation.get('parameters', [])]

            method_spec: OrderedDict[str, Any] = OrderedDict()
            method_spec['summary'] = operation.get('summary', '')

            query_params: OrderedDict[str, Any] = OrderedDict()
            path_params: OrderedDict[str, Any] = OrderedDict()
            filters: dict[str, Any] = {}
            sort_values: list[str] = []

            for parameter in parameters:
                location = parameter.get('in')
                name = parameter.get('name')
                if not name or location == 'header':
                    continue

                if location == 'path':
                    path_params[name] = {
                        key: value
                        for key, value in {
                            'type': param_type(spec, parameter),
                            'description': parameter.get('description'),
                        }.items()
                        if value is not None
                    }
                    continue

                if location != 'query':
                    continue

                if name == 'filter':
                    filters = extract_filters(spec, parameter)
                    continue

                query_entry = OrderedDict()
                query_entry['type'] = param_type(spec, parameter)
                if parameter.get('description'):
                    query_entry['description'] = parameter['description']
                query_params[name] = query_entry

                if name == 'sort':
                    schema = deref(spec, parameter.get('schema', {}))
                    items = deref(spec, schema.get('items', {})) if isinstance(schema, dict) else {}
                    sort_values = list(items.get('enum', []))

            if query_params:
                method_spec['query'] = query_params
            if filters:
                method_spec['filters'] = filters
            if sort_values:
                method_spec['sort'] = sort_values
            if path_params:
                method_spec['pathParams'] = path_params
            if 'requestBody' in operation:
                method_spec['supportsBody'] = True

            methods[method_name] = method_spec

        reference[normalized_path] = OrderedDict(
            path=normalized_path,
            methods=methods,
        )

    return reference


def to_ts(value: Any, indent: int = 0) -> str:
    space = '  ' * indent
    next_space = '  ' * (indent + 1)

    if isinstance(value, dict):
        if not value:
            return '{}'
        items = []
        for key, inner_value in value.items():
            formatted_key = json.dumps(str(key))
            items.append(f'{next_space}{formatted_key}: {to_ts(inner_value, indent + 1)}')
        return '{\n' + ',\n'.join(items) + f'\n{space}}}'

    if isinstance(value, list):
        if not value:
            return '[]'
        items = ', '.join(to_ts(item, indent + 1) for item in value)
        return f'[{items}]'

    return json.dumps(value)


def render_file(reference: OrderedDict[str, Any]) -> str:
    return (
        "import type { ApiReference } from './types.js';\n\n"
        f'export const PRODUCTIVE_API_REFERENCE: ApiReference = {to_ts(reference)} as const;\n'
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()

    spec = fetch_spec()
    reference = generate_reference(spec)
    content = render_file(reference)

    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != content:
            print('Productive API reference is out of date.', file=sys.stderr)
            return 1
        print('Productive API reference is up to date.')
        return 0

    OUTPUT.write_text(content)
    print(f'Wrote {OUTPUT.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
