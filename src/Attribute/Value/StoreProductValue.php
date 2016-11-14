<?php
namespace Concrete\Package\CommunityStore\Src\Attribute\Value;

use Database;
use Concrete\Core\Attribute\Value\Value as Value;

defined('C5_EXECUTE') or die(_("Access Denied."));
class StoreProductValue extends Value
{
    public function setProduct($product)
    {
        $this->product = $product;
    }

    public static function getByID($avID)
    {
        $cav = new self();
        $cav->load($avID);
        if ($cav->getAttributeValueID() == $avID) {
            return $cav;
        }
    }

    public function delete()
    {
        $db = \Database::connection();
        $db->query('delete from CommunityStoreProductAttributeValues where pID = ? and akID = ? and avID = ?', array(
            $this->product->getID(),
            $this->attributeKey->getAttributeKeyID(),
            $this->getAttributeValueID(),
        ));

        // Before we run delete() on the parent object, we make sure that attribute value isn't being referenced in the table anywhere else
        $num = $db->GetOne('select count(avID) from CommunityStoreProductAttributeValues where avID = ?', array($this->getAttributeValueID()));
        if ($num < 1) {
            parent::delete();
        }
    }

    public function getNumProducts($akID, $avID){
        $db = \Database::connection();
        $result = $db->query('Select count(*) as count from CommunityStoreProductAttributeValues as av left join CommunityStoreProducts as p on av.pID = p.pID where av.akID = ? and av.avID = ? and p.pActive = 1', array(
            $akID, $avID
        ));

        $result = $result->fetchRow();
        return $result['count'];
    }
}
