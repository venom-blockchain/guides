import BigNumber from 'bignumber.js';

export interface BaseNftJson {
  name?: string;
  description?: string;
  preview?: {
    source: string;
    mimetype: string;
  };
  files?: Array<{
    source: string;
    mimetype: string;
  }>;
  external_url?: string;
}

export const shortAddress = (_address: string): string => {
  return `${_address?.slice(0, 6)} ••• ${_address?.slice(-4)}`;
};
export const formatBalance = (value: string): string => {
  return new BigNumber(Number(value)).dividedBy(10 ** 9).toString();
};
export const formatDate = (value: number): string => {
  const date = new Date(value * 1000);
  // eslint-disable-next-line max-len
  return `${date.toLocaleDateString()} ${date.getUTCHours()}:${date.getUTCMinutes()}`;
};
export const getValueForSend = (value: string | number): string => {
  return new BigNumber(value).multipliedBy(10 ** 9).toString();
};
