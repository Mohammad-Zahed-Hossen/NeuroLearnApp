import React from 'react';
import Container from './Container';

export const ContainerContext = React.createContext<Container | null>(null);

export const useContainer = () =>
  React.useContext(ContainerContext) as Container;

export default ContainerContext;
