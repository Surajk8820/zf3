import {
  Avatar,
  Box,
  Flex,
  SimpleGrid,
  Skeleton,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import {
  MediaRenderer,
  ThirdwebNftMedia,
  Web3Button,
  useActiveClaimCondition,
  useAddress,
  useClaimNFT,
  useContract,
  useValidDirectListings,
  useValidEnglishAuctions,
} from "@thirdweb-dev/react";
import { NFT, ThirdwebSDK } from "@thirdweb-dev/sdk";
import React, { useState } from "react";
import {
  MARKETPLACE_ADDRESS,
  HOUSE_NFT_COLLECTION_ADDRESS,
} from "../../../../const/addresses";
import { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import styles from "../../../../styles/TokenPage.module.css";
import { useRouter } from "next/router";


type Props = {
  nft: NFT;
  contractMetadata: any;
};

type NftType = {
  metadata?: {
    attributes?: {
      [key: string]: {
        trait_type: string;
        value: string;
      };
    };
  };
};

export default function TokenPage({ nft, contractMetadata }: Props) {
  const { contract: marketplace, isLoading: loadingMarketplace } = useContract(
    MARKETPLACE_ADDRESS,
    "marketplace-v3"
  );

  const { contract: nftCollection } = useContract(HOUSE_NFT_COLLECTION_ADDRESS);
  const address = useAddress();

  // Add for active claim conditions
  const { data: activeClaimCondition, isLoading: isLoadingClaimCondition } =
    useActiveClaimCondition(nftCollection, nft.metadata.id);

  const { data: directListing, isLoading: loadingDirectListing } =
    useValidDirectListings(marketplace, {
      tokenContract: HOUSE_NFT_COLLECTION_ADDRESS,
      tokenId: nft.metadata.id,
    });

  // claim NFT's
  const {
    mutateAsync: claimNft,
    isLoading,
    error,
  } = useClaimNFT(nftCollection);

  //Add these for auction section
  const [bidValue, setBidValue] = useState<string>();

  const { data: auctionListing, isLoading: loadingAuction } =
    useValidEnglishAuctions(marketplace, {
      tokenContract: HOUSE_NFT_COLLECTION_ADDRESS,
      tokenId: nft.metadata.id,
    });

  async function buyListing() {
    let txResult;

    //Add for auction section
    if (auctionListing?.[0]) {
      txResult = await marketplace?.englishAuctions.buyoutAuction(
        auctionListing[0].id
      );
    } else if (directListing?.[0]) {
      txResult = await marketplace?.directListings.buyFromListing(
        directListing[0].id,
        1
      );
    } else {
      throw new Error("No listing found");
    }

    return txResult;
  }

  async function createBidOffer() {
    let txResult;
    if (!bidValue) {
      return;
    }

    if (auctionListing?.[0]) {
      txResult = await marketplace?.englishAuctions.makeBid(
        auctionListing[0].id,
        bidValue
      );
    } else if (directListing?.[0]) {
      txResult = await marketplace?.offers.makeOffer({
        assetContractAddress: HOUSE_NFT_COLLECTION_ADDRESS,
        tokenId: nft.metadata.id,
        totalPrice: bidValue,
      });
    } else {
      throw new Error("No listing found");
    }
    return txResult;
  }

  const router = useRouter()
  const currentTokenId = router.query?.tokenId;

  return (
    <Box className={styles.container} m={"auto"}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 10, md: 20 }}>
        <Stack spacing={"20px"}>
          <Box
            border={"6px solid #24252D"}
            borderRadius={"6px"}
            overflow={"hidden"}
          >
            <Skeleton isLoaded={!loadingMarketplace && !loadingDirectListing}>
              <ThirdwebNftMedia
                metadata={nft.metadata}
                width="100%"
                height="100%"
              />
            </Skeleton>
          </Box>
          <Box>
            <Text fontWeight={"bold"}>Description:</Text>
            <Text>{nft.metadata.description}</Text>
          </Box>
          <Box>
            {activeClaimCondition ? (
              <Flex borderRadius={"5px"} p={4} bg={"#222528"} gap={8}>
                <Box>
                  <Text>Current Phase:</Text>
                  <Text>Supply:</Text>
                  <Text>Price:</Text>
                  <Text>Max Claim Per Wallet:</Text>
                </Box>
                <Box>
                  <Text>{activeClaimCondition.metadata?.name}</Text>
                  <Text>{`${activeClaimCondition?.availableSupply}/${activeClaimCondition?.maxClaimableSupply}`}</Text>
                  <Text>{`${activeClaimCondition?.price} Matic`}</Text>
                  <Text>{activeClaimCondition.maxClaimablePerWallet}</Text>
                </Box>
              </Flex>
            ) : (
              <Skeleton></Skeleton>
            )}
          </Box>
          <Box className={styles.buyBtn}>
            <Web3Button
              contractAddress={HOUSE_NFT_COLLECTION_ADDRESS}
              action={(nftCollection) => nftCollection.erc1155.claim(Number(currentTokenId), 1)}
            >
              Mint Now
            </Web3Button>
          </Box>
        </Stack>

        <Stack spacing={"20px"}>
          {contractMetadata && (
            <Flex alignItems={"center"}>
              <Box borderRadius={"4px"} overflow={"hidden"} mr={"10px"}>
                <MediaRenderer
                  src={contractMetadata.image}
                  height="32px"
                  width="32px"
                />
              </Box>
              <Text fontWeight={"bold"}>{contractMetadata.name}</Text>
            </Flex>
          )}
          <Box mx={2.5}>
            <Text fontSize={{ base: "2xl", md: "4xl" }} fontWeight={"bold"}>
              {nft.metadata.name}
            </Text>
            <Link href={`/profile/${nft.owner}`}>
              <Flex direction={"row"} alignItems={"center"}>
                <Avatar
                  src="https://bit.ly/broken-link"
                  h={"24px"}
                  w={"24px"}
                  mr={"10px"}
                />
                <Text fontSize={"small"}>
                  {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
                </Text>
              </Flex>
            </Link>
          </Box>

          <Stack bg={"#222528"} p={2.5} borderRadius={"6px"}>
            <Text color={"darkgray"}>Price:</Text>
            <Skeleton isLoaded={!loadingMarketplace && !loadingDirectListing}>
              {directListing && directListing[0] ? (
                <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight={"bold"}>
                  {directListing[0]?.currencyValuePerToken.displayValue}
                  {" " + directListing[0]?.currencyValuePerToken.symbol}
                </Text>
              ) : auctionListing && auctionListing[0] ? (
                <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight={"bold"}>
                  {auctionListing[0]?.buyoutCurrencyValue.displayValue}
                  {" " + auctionListing[0]?.buyoutCurrencyValue.symbol}
                </Text>
              ) : (
                <Text fontSize={"3xl"} fontWeight={"bold"}>
                  Not for sale
                </Text>
              )}
            </Skeleton>
            <Skeleton isLoaded={!loadingAuction}>
              {auctionListing && auctionListing[0] && (
                <Flex direction={"column"}>
                  <Text color={"darkgray"}>Bids starting from</Text>
                  <Text fontSize={"3xl"} fontWeight={"bold"}>
                    {auctionListing[0]?.minimumBidCurrencyValue.displayValue}
                    {" " + auctionListing[0]?.minimumBidCurrencyValue.symbol}
                  </Text>
                  <Text></Text>
                </Flex>
              )}
            </Skeleton>
          </Stack>
          <Skeleton
            isLoaded={
              !loadingMarketplace || !loadingDirectListing || !loadingAuction
            }
          >
            {/* --------place bid Button ----------------------------------------------------------------------------------------------------------- */}

            <Stack>
              <Tabs variant="unstyled">
                <TabList
                  justifyContent={{ base: "space-around" }}
                  gap={5}
                  borderRadius={"5px"}
                  bg={"#222528"}
                  p={2}
                  className={styles.tabList}
                >
                  <Tab
                    borderRadius={"5px"}
                    _selected={{ color: "white", bg: "blue" }}
                  >
                    Details
                  </Tab>
                  <Tab
                    borderRadius={"5px"}
                    _selected={{ color: "white", bg: "blue" }}
                  >
                    Properties
                  </Tab>
                  {/* <Tab
                    borderRadius={"5px"}
                    _selected={{ color: "white", bg: "blue" }}
                  >
                    Bids
                  </Tab> */}
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <Flex gap={8} justifyContent={"start"} alignItems={"start"}>
                      <Box>
                        <Text>Contract Address:</Text>
                        <Text>Token Id:</Text>
                        <Text>Chain:</Text>
                        <Text>Token Standred:</Text>
                        <Text>Creator Fee:</Text>
                      </Box>
                      <Box>
                        <Text>265825625d5f4</Text>
                        <Text>265825625d5f4</Text>
                        <Text>Polygon</Text>
                        <Text>ERC-1155</Text>
                        <Text>5%</Text>
                      </Box>
                    </Flex>
                  </TabPanel>
                  <TabPanel>
                    <Box>
                      <Text fontWeight={"bold"}>Traits:</Text>
                      <SimpleGrid columns={2} spacing={4}>
                        {Object.entries(
                          (nft as NftType)?.metadata?.attributes || {}
                        ).map(([key, value]) => (
                          <Flex
                            key={key}
                            direction={"column"}
                            alignItems={"center"}
                            justifyContent={"center"}
                            borderWidth={1}
                            p={"8px"}
                            mt={3}
                            borderRadius={"4px"}
                            _hover={{ background: "#24252E" }}
                          >
                            <Text fontSize={"small"}>{value.trait_type}</Text>
                            <Text fontSize={"small"} fontWeight={"bold"}>
                              {value.value}
                            </Text>
                          </Flex>
                        ))}
                      </SimpleGrid>
                    </Box>
                  </TabPanel>
                  {/* <TabPanel>
                    <Stack spacing={5}>
                      <Flex direction={"column"}>
                        <Input
                          mb={5}
                          defaultValue={
                            auctionListing?.[0]?.minimumBidCurrencyValue
                              ?.displayValue || 0
                          }
                          type={"number"}
                          onChange={(e) => setBidValue(e.target.value)}
                        />
                        <Web3Button
                          contractAddress={MARKETPLACE_ADDRESS}
                          action={async () => await createBidOffer()}
                          isDisabled={!auctionListing || !auctionListing[0]}
                        >
                          Place Bid
                        </Web3Button>
                      </Flex>
                    </Stack>
                  </TabPanel> */}
                </TabPanels>
              </Tabs>
            </Stack>
          </Skeleton>
        </Stack>
      </SimpleGrid>
    </Box>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const tokenId = context.params?.tokenId as string;

  const sdk = new ThirdwebSDK("mumbai");

  const contract = await sdk.getContract(HOUSE_NFT_COLLECTION_ADDRESS);

  const nft = await contract.erc1155.get(tokenId);

  let contractMetadata;

  try {
    contractMetadata = await contract.metadata.get();
  } catch (e) {}

  return {
    props: {
      nft,
      contractMetadata: contractMetadata || null,
    },
    revalidate: 1, // https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const sdk = new ThirdwebSDK("mumbai");

  const contract = await sdk.getContract(HOUSE_NFT_COLLECTION_ADDRESS);

  const nfts = await contract?.erc1155.getAll();

  const paths = nfts.map((nft) => {
    return {
      params: {
        contractAddress: HOUSE_NFT_COLLECTION_ADDRESS,
        tokenId: nft.metadata.id,
      },
    };
  });

  return {
    paths,
    fallback: "blocking",
  };
};
