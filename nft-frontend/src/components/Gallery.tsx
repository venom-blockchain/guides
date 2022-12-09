import React from 'react';
import Loader from './Loader';

type Props = {
  // array of strings wit himage urls
  collectionsItems: string[] | undefined;
  isLoading: boolean;
  title?: string;
  listIsEmpty?: boolean;
};

function Gallery({ collectionsItems, title, listIsEmpty, isLoading }: Props) {
  return (
    <div className="lots">
      {title && <h1>{title}</h1>}
      {listIsEmpty && <h1>The list is empty</h1>}
      <div className="lots__list">
        {isLoading && <Loader />}
        {!isLoading &&
          collectionsItems?.map((item, index) => (
            <div className="lots__item" key={`${index} ${item}`}>
              <img src={item} alt="img" />
            </div>
          ))}
      </div>
    </div>
  );
}

export default Gallery;
